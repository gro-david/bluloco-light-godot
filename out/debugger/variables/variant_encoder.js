"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VariantEncoder = void 0;
const variants_1 = require("./variants");
class VariantEncoder {
    encode_variant(value, model) {
        if (typeof value === "number" &&
            Number.isInteger(value) &&
            (value > 2147483647 || value < -2147483648)) {
            value = BigInt(value);
        }
        if (!model) {
            let size = this.size_variant(value);
            let buffer = Buffer.alloc(size + 4);
            model = {
                buffer: buffer,
                offset: 0,
                len: 0,
            };
            this.encode_UInt32(size, model);
        }
        switch (typeof value) {
            case "number":
                {
                    let is_integer = Number.isInteger(value);
                    if (is_integer) {
                        this.encode_UInt32(variants_1.GDScriptTypes.INT, model);
                        this.encode_UInt32(value, model);
                    }
                    else {
                        this.encode_UInt32(variants_1.GDScriptTypes.REAL | (1 << 16), model);
                        this.encode_Float(value, model);
                    }
                }
                break;
            case "bigint":
                this.encode_UInt32(variants_1.GDScriptTypes.INT | (1 << 16), model);
                this.encode_UInt64(value, model);
                break;
            case "boolean":
                this.encode_UInt32(variants_1.GDScriptTypes.BOOL, model);
                this.encode_Bool(value, model);
                break;
            case "string":
                this.encode_UInt32(variants_1.GDScriptTypes.STRING, model);
                this.encode_String(value, model);
                break;
            case "undefined":
                break;
            default:
                if (Array.isArray(value)) {
                    this.encode_UInt32(variants_1.GDScriptTypes.ARRAY, model);
                    this.encode_Array(value, model);
                }
                else if (value instanceof Map) {
                    this.encode_UInt32(variants_1.GDScriptTypes.DICTIONARY, model);
                    this.encode_Dictionary(value, model);
                }
                else {
                    if (value instanceof variants_1.Vector2) {
                        this.encode_UInt32(variants_1.GDScriptTypes.VECTOR2, model);
                        this.encode_Vector2(value, model);
                    }
                    else if (value instanceof variants_1.Rect2) {
                        this.encode_UInt32(variants_1.GDScriptTypes.RECT2, model);
                        this.encode_Rect2(value, model);
                    }
                    else if (value instanceof variants_1.Vector3) {
                        this.encode_UInt32(variants_1.GDScriptTypes.VECTOR3, model);
                        this.encode_Vector3(value, model);
                    }
                    else if (value instanceof variants_1.Transform2D) {
                        this.encode_UInt32(variants_1.GDScriptTypes.TRANSFORM2D, model);
                        this.encode_Transform2D(value, model);
                    }
                    else if (value instanceof variants_1.Plane) {
                        this.encode_UInt32(variants_1.GDScriptTypes.PLANE, model);
                        this.encode_Plane(value, model);
                    }
                    else if (value instanceof variants_1.Quat) {
                        this.encode_UInt32(variants_1.GDScriptTypes.QUAT, model);
                        this.encode_Quat(value, model);
                    }
                    else if (value instanceof variants_1.AABB) {
                        this.encode_UInt32(variants_1.GDScriptTypes.AABB, model);
                        this.encode_AABB(value, model);
                    }
                    else if (value instanceof variants_1.Basis) {
                        this.encode_UInt32(variants_1.GDScriptTypes.BASIS, model);
                        this.encode_Basis(value, model);
                    }
                    else if (value instanceof variants_1.Transform) {
                        this.encode_UInt32(variants_1.GDScriptTypes.TRANSFORM, model);
                        this.encode_Transform(value, model);
                    }
                    else if (value instanceof variants_1.Color) {
                        this.encode_UInt32(variants_1.GDScriptTypes.COLOR, model);
                        this.encode_Color(value, model);
                    }
                }
        }
        return model.buffer;
    }
    encode_AABB(value, model) {
        this.encode_Vector3(value.position, model);
        this.encode_Vector3(value.size, model);
    }
    encode_Array(arr, model) {
        let size = arr.length;
        this.encode_UInt32(size, model);
        arr.forEach((e) => {
            this.encode_variant(e, model);
        });
    }
    encode_Basis(value, model) {
        this.encode_Vector3(value.x, model);
        this.encode_Vector3(value.y, model);
        this.encode_Vector3(value.z, model);
    }
    encode_Bool(bool, model) {
        this.encode_UInt32(bool ? 1 : 0, model);
    }
    encode_Color(value, model) {
        this.encode_Float(value.r, model);
        this.encode_Float(value.g, model);
        this.encode_Float(value.b, model);
        this.encode_Float(value.a, model);
    }
    encode_Dictionary(dict, model) {
        let size = dict.size;
        this.encode_UInt32(size, model);
        let keys = Array.from(dict.keys());
        keys.forEach((key) => {
            let value = dict.get(key);
            this.encode_variant(key, model);
            this.encode_variant(value, model);
        });
    }
    encode_Double(value, model) {
        model.buffer.writeDoubleLE(value, model.offset);
        model.offset += 8;
    }
    encode_Float(value, model) {
        model.buffer.writeFloatLE(value, model.offset);
        model.offset += 4;
    }
    encode_Plane(value, model) {
        this.encode_Float(value.x, model);
        this.encode_Float(value.y, model);
        this.encode_Float(value.z, model);
        this.encode_Float(value.d, model);
    }
    encode_Quat(value, model) {
        this.encode_Float(value.x, model);
        this.encode_Float(value.y, model);
        this.encode_Float(value.z, model);
        this.encode_Float(value.w, model);
    }
    encode_Rect2(value, model) {
        this.encode_Vector2(value.position, model);
        this.encode_Vector2(value.size, model);
    }
    encode_String(str, model) {
        let str_len = str.length;
        this.encode_UInt32(str_len, model);
        model.buffer.write(str, model.offset, str_len, "utf8");
        model.offset += str_len;
        str_len += 4;
        while (str_len % 4) {
            str_len++;
            model.buffer.writeUInt8(0, model.offset);
            model.offset++;
        }
    }
    encode_Transform(value, model) {
        this.encode_Basis(value.basis, model);
        this.encode_Vector3(value.origin, model);
    }
    encode_Transform2D(value, model) {
        this.encode_Vector2(value.origin, model);
        this.encode_Vector2(value.x, model);
        this.encode_Vector2(value.y, model);
    }
    encode_UInt32(int, model) {
        model.buffer.writeUInt32LE(int, model.offset);
        model.offset += 4;
    }
    encode_UInt64(value, model) {
        let hi = Number(value >> BigInt(32));
        let lo = Number(value);
        this.encode_UInt32(lo, model);
        this.encode_UInt32(hi, model);
    }
    encode_Vector2(value, model) {
        this.encode_Float(value.x, model);
        this.encode_Float(value.y, model);
    }
    encode_Vector3(value, model) {
        this.encode_Float(value.x, model);
        this.encode_Float(value.y, model);
        this.encode_Float(value.z, model);
    }
    size_Bool() {
        return this.size_UInt32();
    }
    size_Dictionary(dict) {
        let size = this.size_UInt32();
        let keys = Array.from(dict.keys());
        keys.forEach((key) => {
            let value = dict.get(key);
            size += this.size_variant(key);
            size += this.size_variant(value);
        });
        return size;
    }
    size_String(str) {
        let size = this.size_UInt32() + str.length;
        while (size % 4) {
            size++;
        }
        return size;
    }
    size_UInt32() {
        return 4;
    }
    size_UInt64() {
        return 8;
    }
    size_array(arr) {
        let size = this.size_UInt32();
        arr.forEach((e) => {
            size += this.size_variant(e);
        });
        return size;
    }
    size_variant(value) {
        let size = 4;
        if (typeof value === "number" &&
            (value > 2147483647 || value < -2147483648)) {
            value = BigInt(value);
        }
        switch (typeof value) {
            case "number":
                size += this.size_UInt32();
                break;
            case "bigint":
                size += this.size_UInt64();
                break;
            case "boolean":
                size += this.size_Bool();
                break;
            case "string":
                size += this.size_String(value);
                break;
            case "undefined":
                break;
            default:
                if (Array.isArray(value)) {
                    size += this.size_array(value);
                    break;
                }
                else if (value instanceof Map) {
                    size += this.size_Dictionary(value);
                    break;
                }
                else {
                    switch (value["__type__"]) {
                        case "Vector2":
                            size += this.size_UInt32() * 2;
                            break;
                        case "Rect2":
                            size += this.size_UInt32() * 4;
                            break;
                        case "Vector3":
                            size += this.size_UInt32() * 3;
                            break;
                        case "Transform2D":
                            size += this.size_UInt32() * 6;
                            break;
                        case "Plane":
                            size += this.size_UInt32() * 4;
                            break;
                        case "Quat":
                            size += this.size_UInt32() * 4;
                            break;
                        case "AABB":
                            size += this.size_UInt32() * 6;
                            break;
                        case "Basis":
                            size += this.size_UInt32() * 9;
                            break;
                        case "Transform":
                            size += this.size_UInt32() * 12;
                            break;
                        case "Color":
                            size += this.size_UInt32() * 4;
                            break;
                    }
                }
        }
        return size;
    }
}
exports.VariantEncoder = VariantEncoder;
//# sourceMappingURL=variant_encoder.js.map