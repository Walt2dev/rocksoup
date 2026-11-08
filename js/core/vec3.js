export class Vector3D {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  clone() {
    return new Vector3D(this.x, this.y, this.z);
  }

  add(other) {
    return new Vector3D(this.x + other.x, this.y + other.y, this.z + other.z);
  }

  sub(other) {
    return new Vector3D(this.x - other.x, this.y - other.y, this.z - other.z);
  }

  scale(scalar) {
    return new Vector3D(this.x * scalar, this.y * scalar, this.z * scalar);
  }

  negate() {
    return new Vector3D(-this.x, -this.y, -this.z);
  }

  dot(other) {
    return this.x * other.x + this.y * other.y + this.z * other.z;
  }

  cross(other) {
    return new Vector3D(
      this.y * other.z - this.z * other.y,
      this.z * other.x - this.x * other.z,
      this.x * other.y - this.y * other.x,
    );
  }

  lengthSq() {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  length() {
    return Math.hypot(this.x, this.y, this.z);
  }

  normalize() {
    const len = this.length();
    if (len === 0) {
      return new Vector3D(0, 0, 0);
    }
    return new Vector3D(this.x / len, this.y / len, this.z / len);
  }

  distanceTo(other) {
    return Math.hypot(this.x - other.x, this.y - other.y, this.z - other.z);
  }

  lerp(other, t) {
    return new Vector3D(
      this.x + (other.x - this.x) * t,
      this.y + (other.y - this.y) * t,
      this.z + (other.z - this.z) * t,
    );
  }

  equals(other, epsilon = 1e-9) {
    return (
      Math.abs(this.x - other.x) <= epsilon &&
      Math.abs(this.y - other.y) <= epsilon &&
      Math.abs(this.z - other.z) <= epsilon
    );
  }

  toArray() {
    return [this.x, this.y, this.z];
  }

  toString() {
    return `Vector3D(${this.x}, ${this.y}, ${this.z})`;
  }
}
