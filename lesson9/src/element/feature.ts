import {Bound} from "../util/bound";
import {Geometry} from "../geometry/geometry";
import {Symbol, SimplePointSymbol, SimpleTextSymbol} from "../symbol/symbol";
import {Projection} from "../projection/projection";
import {WebMercator} from "../projection/web-mercator";
import {Field} from "../data/field";
import {Subject} from "../util/subject";

//矢量要素
export class Feature extends Subject{
    //图形（空间坐标信息）
    private _geometry: Geometry;
    //属性信息
    private _properties: any;
    //渲染符号
    //****************重要说明***************
    //此处两个符号，本应不存在：
    //Graphic vs Feature：Graphic作为图形，可以一图形对应一渲染符号；而Feature作为矢量要素，常规应该根据图层设定的渲染方式Renderer来得到各个Feature的渲染符号，而非单一设置。
    //此处加入的原因如下：
    //由于一些特例需求的存在，例如要素被选中状态，要素需要高亮符号等等，因此该符号独立于图层的渲染方式，原本针对这些特例会做一些专门的解决模式（可参考ArcGIS，设定图层专有的选中符号），
    //但此处为方便起见，暂保留该设置。
    private _symbol: Symbol;
    //标注符号，参考上方说明
    private _text: SimpleTextSymbol;
    //记录鼠标是否当前悬停在要素内
    private _contained: boolean;
    //是否可见
    public visible: boolean = true;

    //****************重要说明***************
    //有关 getter setter
    //1.如按原先代码规则，private _variable  
    //  只做为类内部函数服务：no getter no setter
    //  只读：getter no setter
    //  读写：getter + setter
    //2.后经 public 的定义扩展，可得到：
    //  public = private + getter + setter
    //  另：public 可省略
    //注：两种规则无差别，按习惯编写。
    get symbol(): Symbol {
        return this._symbol;
    }
    set symbol(value: Symbol) {
        this._symbol = value;
    }
    get geometry(): Geometry {
        return this._geometry;
    }
    get properties(): any {
        return this._properties;
    }
    get text(): SimpleTextSymbol {
        return this._text;
    }
    set text(value: SimpleTextSymbol) {
        this._text = value;
    }

    constructor(geometry, properties, symbol?) {
        //该对象可订阅如下事件
        super(["click", "dblclick", "mouseover", "mouseout"]);
        this._geometry = geometry;
        this._properties = properties;
        this._symbol = symbol;
    }

    //绘制要素
    //调用空间坐标信息进行图形绘制
    draw(ctx: CanvasRenderingContext2D, projection: Projection = new WebMercator(), extent: Bound = projection.bound, symbol: Symbol = new SimplePointSymbol()) {
        if (this.visible) this._geometry.draw(ctx, projection, extent, (this._symbol || symbol));
    }

    //判断是否在可视范围内
    intersect(projection: Projection = new WebMercator(), extent: Bound = projection.bound): boolean {
        if (this.visible) return this._geometry.intersect(projection, extent);
    }

    //标注要素
    //调用空间坐标信息进行标注绘制
    label(field: Field, ctx: CanvasRenderingContext2D, projection: Projection = new WebMercator(), symbol: SimpleTextSymbol = new SimpleTextSymbol()) {
        if (this.visible) this._geometry.label(this._properties[field.name], ctx, projection,this._text || symbol);
    }

    //交互判断
    //鼠标坐标是否落入要素
    contain(screenX: number, screenY: number, event: string = undefined): boolean {
        if (this.visible) {
            const flag = this._geometry.contain(screenX, screenY);
            if (event == "mousemove") {
                if (!this._contained && flag) {
                    //如果鼠标当前不在要素内，同时鼠标进入到要素内
                    this.emit("mouseover", {feature: this, screenX: screenX, screenY: screenY});
                } else if(this._contained && !flag) {
                    //如果鼠标当前在要素内，同时鼠标移出到要素外
                    this.emit("mouseout", {feature: this, screenX: screenX, screenY: screenY});
                }
            }
            this._contained = flag;
            return flag;
        }
    }

}