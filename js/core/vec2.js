export class Vector2D {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  clone() {
    return new Vector2D(this.x, this.y);
  }

  add(other) {
    return new Vector2D(this.x + other.x, this.y + other.y);
  }

  sub(other) {
    return new Vector2D(this.x - other.x, this.y - other.y);
  }

  scale(scalar) {
    return new Vector2D(this.x * scalar, this.y * scalar);
  }

  negate() {
    return new Vector2D(-this.x, -this.y);
  }

  dot(other) {
    return this.x * other.x + this.y * other.y;
  }

  lengthSq() {
    return this.x * this.x + this.y * this.y;
  }

  length() {
    return Math.hypot(this.x, this.y);
  }

  normalize() {
    const len = this.length();
    if (len === 0) {
      return new Vector2D(0, 0);
    }
    return new Vector2D(this.x / len, this.y / len);
  }

  distanceTo(other) {
    return Math.hypot(this.x - other.x, this.y - other.y);
  }

  lerp(other, t) {
    return new Vector2D(this.x + (other.x - this.x) * t, this.y + (other.y - this.y) * t);
  }

  equals(other, epsilon = 1e-9) {
    return Math.abs(this.x - other.x) <= epsilon && Math.abs(this.y - other.y) <= epsilon;
  }

  toArray() {
    return [this.x, this.y];
  }

  toString() {
    return `Vector2D(${this.x}, ${this.y})`;
  }
}
