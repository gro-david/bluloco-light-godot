"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transform2D = exports.Transform = exports.Rect2 = exports.Quat = exports.Plane = exports.ObjectId = exports.RawObject = exports.NodePath = exports.Color = exports.AABB = exports.Basis = exports.Vector2 = exports.Vector3 = exports.GDScriptTypes = void 0;
var GDScriptTypes;
(function (GDScriptTypes) {
    GDScriptTypes[GDScriptTypes["NIL"] = 0] = "NIL";
    // atomic types
    GDScriptTypes[GDScriptTypes["BOOL"] = 1] = "BOOL";
    GDScriptTypes[GDScriptTypes["INT"] = 2] = "INT";
    GDScriptTypes[GDScriptTypes["REAL"] = 3] = "REAL";
    GDScriptTypes[GDScriptTypes["STRING"] = 4] = "STRING";
    // math types
    GDScriptTypes[GDScriptTypes["VECTOR2"] = 5] = "VECTOR2";
    GDScriptTypes[GDScriptTypes["RECT2"] = 6] = "RECT2";
    GDScriptTypes[GDScriptTypes["VECTOR3"] = 7] = "VECTOR3";
    GDScriptTypes[GDScriptTypes["TRANSFORM2D"] = 8] = "TRANSFORM2D";
    GDScriptTypes[GDScriptTypes["PLANE"] = 9] = "PLANE";
    GDScriptTypes[GDScriptTypes["QUAT"] = 10] = "QUAT";
    GDScriptTypes[GDScriptTypes["AABB"] = 11] = "AABB";
    GDScriptTypes[GDScriptTypes["BASIS"] = 12] = "BASIS";
    GDScriptTypes[GDScriptTypes["TRANSFORM"] = 13] = "TRANSFORM";
    // misc types
    GDScriptTypes[GDScriptTypes["COLOR"] = 14] = "COLOR";
    GDScriptTypes[GDScriptTypes["NODE_PATH"] = 15] = "NODE_PATH";
    GDScriptTypes[GDScriptTypes["_RID"] = 16] = "_RID";
    GDScriptTypes[GDScriptTypes["OBJECT"] = 17] = "OBJECT";
    GDScriptTypes[GDScriptTypes["DICTIONARY"] = 18] = "DICTIONARY";
    GDScriptTypes[GDScriptTypes["ARRAY"] = 19] = "ARRAY";
    // arrays
    GDScriptTypes[GDScriptTypes["POOL_BYTE_ARRAY"] = 20] = "POOL_BYTE_ARRAY";
    GDScriptTypes[GDScriptTypes["POOL_INT_ARRAY"] = 21] = "POOL_INT_ARRAY";
    GDScriptTypes[GDScriptTypes["POOL_REAL_ARRAY"] = 22] = "POOL_REAL_ARRAY";
    GDScriptTypes[GDScriptTypes["POOL_STRING_ARRAY"] = 23] = "POOL_STRING_ARRAY";
    GDScriptTypes[GDScriptTypes["POOL_VECTOR2_ARRAY"] = 24] = "POOL_VECTOR2_ARRAY";
    GDScriptTypes[GDScriptTypes["POOL_VECTOR3_ARRAY"] = 25] = "POOL_VECTOR3_ARRAY";
    GDScriptTypes[GDScriptTypes["POOL_COLOR_ARRAY"] = 26] = "POOL_COLOR_ARRAY";
    GDScriptTypes[GDScriptTypes["VARIANT_MAX"] = 27] = "VARIANT_MAX";
})(GDScriptTypes = exports.GDScriptTypes || (exports.GDScriptTypes = {}));
function clean_number(value) {
    return +Number.parseFloat(String(value)).toFixed(1);
}
class Vector3 {
    constructor(x = 0.0, y = 0.0, z = 0.0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    stringify_value() {
        return `(${clean_number(this.x)}, ${clean_number(this.y)}, ${clean_number(this.z)})`;
    }
    sub_values() {
        return [
            { name: "x", value: this.x },
            { name: "y", value: this.y },
            { name: "z", value: this.z },
        ];
    }
    type_name() {
        return "Vector3";
    }
}
exports.Vector3 = Vector3;
class Vector2 {
    constructor(x = 0.0, y = 0.0) {
        this.x = x;
        this.y = y;
    }
    stringify_value() {
        return `(${clean_number(this.x)}, ${clean_number(this.y)})`;
    }
    sub_values() {
        return [
            { name: "x", value: this.x },
            { name: "y", value: this.y },
        ];
    }
    type_name() {
        return "Vector2";
    }
}
exports.Vector2 = Vector2;
class Basis {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    stringify_value() {
        return `(${this.x.stringify_value()}, ${this.y.stringify_value()}, ${this.z.stringify_value()})`;
    }
    sub_values() {
        return [
            { name: "x", value: this.x },
            { name: "y", value: this.y },
            { name: "z", value: this.z },
        ];
    }
    type_name() {
        return "Basis";
    }
}
exports.Basis = Basis;
class AABB {
    constructor(position, size) {
        this.position = position;
        this.size = size;
    }
    stringify_value() {
        return `(${this.position.stringify_value()}, ${this.size.stringify_value()})`;
    }
    sub_values() {
        return [
            { name: "position", value: this.position },
            { name: "size", value: this.size },
        ];
    }
    type_name() {
        return "AABB";
    }
}
exports.AABB = AABB;
class Color {
    constructor(r, g, b, a = 1.0) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }
    stringify_value() {
        return `(${clean_number(this.r)}, ${clean_number(this.g)}, ${clean_number(this.b)}, ${clean_number(this.a)})`;
    }
    sub_values() {
        return [
            { name: "r", value: this.r },
            { name: "g", value: this.g },
            { name: "b", value: this.b },
            { name: "a", value: this.a },
        ];
    }
    type_name() {
        return "Color";
    }
}
exports.Color = Color;
class NodePath {
    constructor(names, sub_names, absolute) {
        this.names = names;
        this.sub_names = sub_names;
        this.absolute = absolute;
    }
    stringify_value() {
        return `(/${this.names.join("/")}${this.sub_names.length > 0 ? ":" : ""}${this.sub_names.join(":")})`;
    }
    sub_values() {
        return [
            { name: "names", value: this.names },
            { name: "sub_names", value: this.sub_names },
            { name: "absolute", value: this.absolute },
        ];
    }
    type_name() {
        return "NodePath";
    }
}
exports.NodePath = NodePath;
class RawObject extends Map {
    constructor(class_name) {
        super();
        this.class_name = class_name;
    }
}
exports.RawObject = RawObject;
class ObjectId {
    constructor(id) {
        this.id = id;
    }
    stringify_value() {
        return `<${this.id}>`;
    }
    sub_values() {
        return [{ name: "id", value: this.id }];
    }
    type_name() {
        return "Object";
    }
}
exports.ObjectId = ObjectId;
class Plane {
    constructor(x, y, z, d) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.d = d;
    }
    stringify_value() {
        return `(${clean_number(this.x)}, ${clean_number(this.y)}, ${clean_number(this.z)}, ${clean_number(this.d)})`;
    }
    sub_values() {
        return [
            { name: "x", value: this.x },
            { name: "y", value: this.y },
            { name: "z", value: this.z },
            { name: "d", value: this.d },
        ];
    }
    type_name() {
        return "Plane";
    }
}
exports.Plane = Plane;
class Quat {
    constructor(x, y, z, w) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }
    stringify_value() {
        return `(${clean_number(this.x)}, ${clean_number(this.y)}, ${clean_number(this.z)}, ${clean_number(this.w)})`;
    }
    sub_values() {
        return [
            { name: "x", value: this.x },
            { name: "y", value: this.y },
            { name: "z", value: this.z },
            { name: "w", value: this.w },
        ];
    }
    type_name() {
        return "Quat";
    }
}
exports.Quat = Quat;
class Rect2 {
    constructor(position, size) {
        this.position = position;
        this.size = size;
    }
    stringify_value() {
        return `(${this.position.stringify_value()} - ${this.size.stringify_value()})`;
    }
    sub_values() {
        return [
            { name: "position", value: this.position },
            { name: "size", value: this.size },
        ];
    }
    type_name() {
        return "Rect2";
    }
}
exports.Rect2 = Rect2;
class Transform {
    constructor(basis, origin) {
        this.basis = basis;
        this.origin = origin;
    }
    stringify_value() {
        return `(${this.basis.stringify_value()} - ${this.origin.stringify_value()})`;
    }
    sub_values() {
        return [
            { name: "basis", value: this.basis },
            { name: "origin", value: this.origin },
        ];
    }
    type_name() {
        return "Transform";
    }
}
exports.Transform = Transform;
class Transform2D {
    constructor(origin, x, y) {
        this.origin = origin;
        this.x = x;
        this.y = y;
    }
    stringify_value() {
        return `(${this.origin.stringify_value()} - (${this.x.stringify_value()}, ${this.y.stringify_value()})`;
    }
    sub_values() {
        return [
            { name: "origin", value: this.origin },
            { name: "x", value: this.x },
            { name: "y", value: this.y },
        ];
    }
    type_name() {
        return "Transform2D";
    }
}
exports.Transform2D = Transform2D;
//# sourceMappingURL=variants.js.map