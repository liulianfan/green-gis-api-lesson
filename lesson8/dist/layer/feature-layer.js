import { Layer } from "./layer";
import { WebMercator } from "../projection/web-mercator";
import { SimpleRenderer } from "../renderer/simple-renderer";
import { CategoryRenderer } from "../renderer/category-renderer";
import { ClassRenderer } from "../renderer/class-renderer";
import { GeometryType, CoordinateType } from "../geometry/geometry";
import { Point } from "../geometry/point";
import { ClusterSymbol } from "../symbol/symbol";
export class FeatureLayer extends Layer {
    constructor() {
        super(...arguments);
        this._zoom = [3, 20];
        //是否显示标注
        this.labeled = false;
        //是否聚合
        this.cluster = false;
    }
    get featureClass() {
        return this._featureClass;
    }
    set featureClass(value) {
        this._featureClass = value;
    }
    set label(value) {
        this._label = value;
    }
    set renderer(value) {
        this._renderer = value;
    }
    //地图事件注册监听
    on(event, handler) {
        this._featureClass.features.forEach((feature) => {
            feature.on(event, handler);
        });
    }
    off(event, handler) {
        this._featureClass.features.forEach((feature) => {
            feature.off(event, handler);
        });
    }
    emit(event, param) {
        this._featureClass.features.forEach((feature) => {
            feature.emit(event, param);
        });
    }
    draw(ctx, projection = new WebMercator(), extent = projection.bound, zoom = 10) {
        /* if (this.visible && this._zoom[0] <= zoom && this._zoom[1] >= zoom) {
            this._featureClass.features.forEach( (feature: Feature) => {
                feature.draw(ctx, projection, extent, this._getSymbol(feature));
            });
        } */
        if (this.visible && this._zoom[0] <= zoom && this._zoom[1] >= zoom) {
            const features = this._featureClass.features.filter((feature) => feature.intersect(projection, extent));
            if (this._featureClass.type == GeometryType.Point && this.cluster) {
                const cluster = features.reduce((acc, cur) => {
                    if (cur.geometry instanceof Point) {
                        const point = cur.geometry;
                        const item = acc.find((item) => {
                            const distance = point.distance(item.feature.geometry, CoordinateType.Screen, ctx, projection);
                            return distance <= 50;
                        });
                        if (item) {
                            item.count += 1;
                        }
                        else {
                            acc.push({ feature: cur, count: 1 });
                        }
                        return acc;
                    }
                }, []); // [{feature, count}]
                cluster.forEach((item) => {
                    if (item.count == 1) {
                        item.feature.draw(ctx, projection, extent, this._getSymbol(item.feature));
                    }
                    else {
                        item.feature.draw(ctx, projection, extent, new ClusterSymbol(item.count));
                    }
                });
            }
            else {
                features.forEach((feature) => {
                    feature.draw(ctx, projection, extent, this._getSymbol(feature));
                });
            }
        }
    }
    drawLabel(ctx, projection = new WebMercator(), extent = projection.bound, zoom = 10) {
        if (this.visible && !this.cluster && this._zoom[0] <= zoom && this._zoom[1] >= zoom) {
            const features = this._featureClass.features.filter((feature) => feature.intersect(projection, extent));
            this._label.draw(features, ctx, projection);
        }
    }
    _getSymbol(feature) {
        if (this._renderer instanceof SimpleRenderer) {
            return this._renderer.symbol;
        }
        else if (this._renderer instanceof CategoryRenderer) {
            const renderer = this._renderer;
            const item = renderer.items.find(item => item.value == feature.properties[renderer.field.name]);
            return item.symbol;
        }
        else if (this._renderer instanceof ClassRenderer) {
            const renderer = this._renderer;
            const item = renderer.items.find(item => item.low <= feature.properties[renderer.field.name] && item.high >= feature.properties[renderer.field.name]);
            return item.symbol;
        }
    }
    contain(screenX, screenY, projection = new WebMercator(), extent = projection.bound, zoom = 10, event = undefined) {
        if (this.visible && this._zoom[0] <= zoom && this._zoom[1] >= zoom) {
            //if call Array.some, maybe abort mouseout last feature which mouseover!!! but filter maybe cause slow!!!no choice
            //return this._featureClass.features.filter((feature: Feature) => feature.intersect(projection, extent)).some( (feature: Feature) => {
            const features = this._featureClass.features.filter((feature) => feature.intersect(projection, extent)).filter((feature) => {
                return feature.contain(screenX, screenY, event);
            });
            if (features.length > 0) {
                if (event == "dblclick") {
                    features[0].emit("dblclick", { feature: features[0], screenX: screenX, screenY: screenY });
                }
                else if (event == "click") {
                    features[0].emit("click", { feature: features[0], screenX: screenX, screenY: screenY });
                }
                return true;
            }
            else {
                return false;
            }
        }
    }
}
