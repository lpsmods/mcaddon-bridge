import { Player, system } from "@minecraft/server";
import { bridgeObject } from "./bridge";
import { Packet, PacketData } from "./packet";
import { uuid } from "./utils";

export class Connection {
  readonly addonId: string;

  constructor(addonId: string) {
    this.addonId = addonId;
  }

  /**
   * Pings the addon to check if it is available.
   * @returns {Promise<void>}
   */
  async connect(): Promise<Connection | undefined> {
    return new Promise((resolve, reject) => {
      const id = `bridge:${uuid()}`;
      const data = new PacketData();
      data.set("method", "connect");
      data.set("addon", this.addonId);
      Packet.send(id, data)
        .then((res) => {
          if (res.get("error")) reject(undefined);
          resolve(this);
        })
        .catch((res) => {
          resolve(undefined);
        });
    });
  }

  async docs(player: Player): Promise<void> {
    return new Promise((resolve, reject) => {
      const id = `bridge:${uuid()}`;
      const data = new PacketData();
      data.set("method", "docs");
      data.set("addon", this.addonId);
      data.writeEntity("player", player);
      Packet.send(id, data)
        .then((res) => {
          if (res.get("error")) {
            reject(res.get("message"));
            return;
          }
          resolve();
        })
        .catch(reject);
    });
  }

  /**
   * Get a property from an object.
   * @param {bridgeObject} object
   * @param {string} property
   * @returns {Promise<any>}
   */
  async get(object: bridgeObject, property: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = `bridge:${uuid()}`;
      const data = new PacketData();
      data.set("method", "get");
      data.set("addon", this.addonId);
      data.set("object", object.constructor.name);
      data.set("property", property);
      Packet.send(id, data)
        .then((res) => {
          if (res.get("error")) {
            reject(res.get("message"));
            return;
          }
          resolve(res.get("value"));
        })
        .catch(reject);
    });
  }

  /**
   * Set a property on an object.
   * @param {bridgeObject} object
   * @param {string} property
   * @param {any} value
   * @returns {Promise<void>}
   */
  async set(object: bridgeObject, property: string, value: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const id = `bridge:${uuid()}`;
      const data = new PacketData();
      data.set("method", "set");
      data.set("addon", this.addonId);
      data.set("object", object.constructor.name);
      data.set("property", property);
      data.set("value", value);
      Packet.send(id, data)
        .then((res) => {
          if (res.get("error")) {
            reject(res.get("message"));
            return;
          }
          resolve();
        })
        .catch(reject);
    });
  }

  /**
   *
   * @param {bridgeObject} object
   * @param {string} property
   * @returns {Promise<void>}
   */
  async has(object: bridgeObject, property: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const id = `bridge:${uuid()}`;
      const data = new PacketData();
      data.set("method", "has");
      data.set("addon", this.addonId);
      data.set("object", object.constructor.name);
      data.set("property", property);
      Packet.send(id, data)
        .then((res) => {
          resolve(res.get("value"));
        })
        .catch(reject);
    });
  }

  /**
   * CAll a function on an object.
   * @param {bridgeObject} object
   * @param {string} property
   * @param {...any} args
   * @returns
   */
  async call(
    object: bridgeObject,
    property: string,
    ...args: any
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = `bridge:${uuid()}`;
      const data = new PacketData();
      data.set("method", "call");
      data.set("addon", this.addonId);
      data.set("object", object.constructor.name);
      data.set("property", property);
      data.set("args", args);
      Packet.send(id, data)
        .then((res) => {
          if (res.get("error")) {
            reject(res.get("message"));
            return;
          }
          resolve(res.get("value"));
        })
        .then(reject);
    });
  }
}

/**
 * Connect to an addon.
 * @param {string} addonId
 * @returns {Promise<Connection|undefined>}
 */
export function connect(addonId: string): Promise<Connection | undefined> {
  const c = new Connection(addonId);
  return c.connect();
}
