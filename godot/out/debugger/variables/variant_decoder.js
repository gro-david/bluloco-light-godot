"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VariantDecoder = void 0;
const variants_1 = require("./variants");
class VariantDecoder {
    decode_variant(model) {
        let type = this.decode_UInt32(model);
        switch (type & 0xff) {
            case variants_1.GDScriptTypes.BOOL:
                return this.decode_UInt32(model) !== 0;
            case variants_1.GDScriptTypes.INT:
                if (type & (1 << 16)) {
                    return this.decode_Int64(model);
                }
                else {
                    return this.decode_Int32(model);
                }
            case variants_1.GDScriptTypes.REAL:
                if (type & (1 << 16)) {
                    return this.decode_Double(model);
                }
                else {
                    return this.decode_Float(model);
                }
            case variants_1.GDScriptTypes.STRING:
                return this.decode_String(model);
            case variants_1.GDScriptTypes.VECTOR2:
                return this.decode_Vector2(model);
            case variants_1.GDScriptTypes.RECT2:
                return this.decode_Rect2(model);
            case variants_1.GDScriptTypes.VECTOR3:
                return this.decode_Vector3(model);
            case variants_1.GDScriptTypes.TRANSFORM2D:
                return this.decode_Transform2D(model);
            case variants_1.GDScriptTypes.PLANE:
                return this.decode_Plane(model);
            case variants_1.GDScriptTypes.QUAT:
                return this.decode_Quat(model);
            case variants_1.GDScriptTypes.AABB:
                return this.decode_AABB(model);
            case variants_1.GDScriptTypes.BASIS:
                return this.decode_Basis(model);
            case variants_1.GDScriptTypes.TRANSFORM:
                return this.decode_Transform(model);
            case variants_1.GDScriptTypes.COLOR:
                return this.decode_Color(model);
            case variants_1.GDScriptTypes.NODE_PATH:
                return this.decode_NodePath(model);
            case variants_1.GDScriptTypes.OBJECT:
                if (type & (1 << 16)) {
                    return this.decode_Object_id(model);
                }
                else {
                    return this.decode_Object(model);
                }
            case variants_1.GDScriptTypes.DICTIONARY:
                return this.decode_Dictionary(model);
            case variants_1.GDScriptTypes.ARRAY:
                return this.decode_Array(model);
            case variants_1.GDScriptTypes.POOL_BYTE_ARRAY:
                return this.decode_PoolByteArray(model);
            case variants_1.GDScriptTypes.POOL_INT_ARRAY:
                return this.decode_PoolIntArray(model);
            case variants_1.GDScriptTypes.POOL_REAL_ARRAY:
                return this.decode_PoolFloatArray(model);
            case variants_1.GDScriptTypes.POOL_STRING_ARRAY:
                return this.decode_PoolStringArray(model);
            case variants_1.GDScriptTypes.POOL_VECTOR2_ARRAY:
                return this.decode_PoolVector2Array(model);
            case variants_1.GDScriptTypes.POOL_VECTOR3_ARRAY:
                return this.decode_PoolVector3Array(model);
            case variants_1.GDScriptTypes.POOL_COLOR_ARRAY:
                return this.decode_PoolColorArray(model);
            default:
                return undefined;
        }
    }
    get_dataset(buffer, offset) {
        let len = buffer.readUInt32LE(offset);
        let model = {
            buffer: buffer,
            offset: offset + 4,
            len: len,
        };
        let output = [];
        output.push(len + 4);
        do {
            let value = this.decode_variant(model);
            output.push(value);
        } while (model.len > 0);
        return output;
    }
    decode_AABB(model) {
        return new variants_1.AABB(this.decode_Vector3(model), this.decode_Vector3(model));
    }
    decode_Array(model) {
        let output = [];
        let count = this.decode_UInt32(model);
        for (let i = 0; i < count; i++) {
            let value = this.decode_variant(model);
            output.push(value);
        }
        return output;
    }
    decode_Basis(model) {
        return new variants_1.Basis(this.decode_Vector3(model), this.decode_Vector3(model), this.decode_Vector3(model));
    }
    decode_Color(model) {
        let rgb = this.decode_Vector3(model);
        let a = this.decode_Float(model);
        return new variants_1.Color(rgb.x, rgb.y, rgb.z, a);
    }
    decode_Dictionary(model) {
        let output = new Map();
        let count = this.decode_UInt32(model);
        for (let i = 0; i < count; i++) {
            let key = this.decode_variant(model);
            let value = this.decode_variant(model);
            output.set(key, value);
        }
        return output;
    }
    decode_Double(model) {
        let d = model.buffer.readDoubleLE(model.offset);
        model.offset += 8;
        model.len -= 8;
        return d; // + (d < 0 ? -1e-10 : 1e-10);
    }
    decode_Float(model) {
        let f = model.buffer.readFloatLE(model.offset);
        model.offset += 4;
        model.len -= 4;
        return f; // + (f < 0 ? -1e-10 : 1e-10);
    }
    decode_Int32(model) {
        let u = model.buffer.readInt32LE(model.offset);
        model.len -= 4;
        model.offset += 4;
        return u;
    }
    decode_Int64(model) {
        let hi = model.buffer.readInt32LE(model.offset);
        let lo = model.buffer.readInt32LE(model.offset + 4);
        let u = BigInt((hi << 32) | lo);
        model.len -= 8;
        model.offset += 8;
        return u;
    }
    decode_NodePath(model) {
        let name_count = this.decode_UInt32(model) & 0x7fffffff;
        let subname_count = this.decode_UInt32(model);
        let flags = this.decode_UInt32(model);
        let is_absolute = (flags & 1) === 1;
        if (flags & 2) {
            //Obsolete format with property separate from subPath
            subname_count++;
        }
        let total = name_count + subname_count;
        let names = [];
        let sub_names = [];
        for (let i = 0; i < total; i++) {
            let str = this.decode_String(model);
            if (i < name_count) {
                names.push(str);
            }
            else {
                sub_names.push(str);
            }
        }
        return new variants_1.NodePath(names, sub_names, is_absolute);
    }
    decode_Object(model) {
        let class_name = this.decode_String(model);
        let prop_count = this.decode_UInt32(model);
        let output = new variants_1.RawObject(class_name);
        for (let i = 0; i < prop_count; i++) {
            let name = this.decode_String(model);
            let value = this.decode_variant(model);
            output.set(name, value);
        }
        return output;
    }
    decode_Object_id(model) {
        let id = this.decode_UInt64(model);
        return new variants_1.ObjectId(id);
    }
    decode_Plane(model) {
        let x = this.decode_Float(model);
        let y = this.decode_Float(model);
        let z = this.decode_Float(model);
        let d = this.decode_Float(model);
        return new variants_1.Plane(x, y, z, d);
    }
    decode_PoolByteArray(model) {
        let count = this.decode_UInt32(model);
        let output = [];
        for (let i = 0; i < count; i++) {
            output.push(model.buffer.readUInt8(model.offset));
            model.offset++;
            model.len--;
        }
        return output;
    }
    decode_PoolColorArray(model) {
        let count = this.decode_UInt32(model);
        let output = [];
        for (let i = 0; i < count; i++) {
            output.push(this.decode_Color(model));
        }
        return output;
    }
    decode_PoolFloatArray(model) {
        let count = this.decode_UInt32(model);
        let output = [];
        for (let i = 0; i < count; i++) {
            output.push(this.decode_Float(model));
        }
        return output;
    }
    decode_PoolIntArray(model) {
        let count = this.decode_UInt32(model);
        let output = [];
        for (let i = 0; i < count; i++) {
            output.push(this.decode_Int32(model));
        }
        return output;
    }
    decode_PoolStringArray(model) {
        let count = this.decode_UInt32(model);
        let output = [];
        for (let i = 0; i < count; i++) {
            output.push(this.decode_String(model));
        }
        return output;
    }
    decode_PoolVector2Array(model) {
        let count = this.decode_UInt32(model);
        let output = [];
        for (let i = 0; i < count; i++) {
            output.push(this.decode_Vector2(model));
        }
        return output;
    }
    decode_PoolVector3Array(model) {
        let count = this.decode_UInt32(model);
        let output = [];
        for (let i = 0; i < count; i++) {
            output.push(this.decode_Vector3(model));
        }
        return output;
    }
    decode_Quat(model) {
        let x = this.decode_Float(model);
        let y = this.decode_Float(model);
        let z = this.decode_Float(model);
        let w = this.decode_Float(model);
        return new variants_1.Quat(x, y, z, w);
    }
    decode_Rect2(model) {
        return new variants_1.Rect2(this.decode_Vector2(model), this.decode_Vector2(model));
    }
    decode_String(model) {
        let len = this.decode_UInt32(model);
        let pad = 0;
        if (len % 4 !== 0) {
            pad = 4 - (len % 4);
        }
        let str = model.buffer.toString("utf8", model.offset, model.offset + len);
        len += pad;
        model.offset += len;
        model.len -= len;
        return str;
    }
    decode_Transform(model) {
        return new variants_1.Transform(this.decode_Basis(model), this.decode_Vector3(model));
    }
    decode_Transform2D(model) {
        return new variants_1.Transform2D(this.decode_Vector2(model), this.decode_Vector2(model), this.decode_Vector2(model));
    }
    decode_UInt32(model) {
        let u = model.buffer.readUInt32LE(model.offset);
        model.len -= 4;
        model.offset += 4;
        return u;
    }
    decode_UInt64(model) {
        let hi = model.buffer.readUInt32LE(model.offset);
        let lo = model.buffer.readUInt32LE(model.offset + 4);
        let u = BigInt((hi << 32) | lo);
        model.len -= 8;
        model.offset += 8;
        return u;
    }
    decode_Vector2(model) {
        let x = this.decode_Float(model);
        let y = this.decode_Float(model);
        return new variants_1.Vector2(x, y);
    }
    decode_Vector3(model) {
        let x = this.decode_Float(model);
        let y = this.decode_Float(model);
        let z = this.decode_Float(model);
        return new variants_1.Vector3(x, y, z);
    }
}
exports.VariantDecoder = VariantDecoder;
//# sourceMappingURL=variant_decoder.js.map