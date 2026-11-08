export class EntityWorld {
  constructor() {
    this.nextId = 1;
    this.entities = new Map();
  }

  get size() {
    return this.entities.size;
  }

  createEntity(components = {}) {
    const id = this.nextId;
    this.nextId += 1;
    const entity = new Map();

    for (const [name, data] of Object.entries(components)) {
      entity.set(name, data);
    }

    this.entities.set(id, entity);
    return id;
  }

  destroyEntity(id) {
    return this.entities.delete(id);
  }

  hasEntity(id) {
    return this.entities.has(id);
  }

  addComponent(id, name, data = {}) {
    const entity = this.entities.get(id);
    if (!entity) {
      throw new Error(`Entidad inexistente: ${id}`);
    }
    entity.set(name, data);
    return data;
  }

  getComponent(id, name) {
    return this.entities.get(id)?.get(name);
  }

  hasComponent(id, name) {
    return this.entities.get(id)?.has(name) ?? false;
  }

  removeComponent(id, name) {
    return this.entities.get(id)?.delete(name) ?? false;
  }

  query(...names) {
    const result = [];

    for (const [id, components] of this.entities) {
      let matches = true;
      for (const name of names) {
        if (!components.has(name)) {
          matches = false;
          break;
        }
      }
      if (matches) {
        result.push(id);
      }
    }

    return result;
  }

  clear() {
    this.entities.clear();
    this.nextId = 1;
  }
}
