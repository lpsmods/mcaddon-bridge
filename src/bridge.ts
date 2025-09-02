import { Entity, Player, RawMessage, World } from "@minecraft/server";
import { PacketData, PacketEvents, PacketReceiveEvent } from "./packet";
import { getObject } from "./utils";
import { ActionFormData, ActionFormResponse } from "@minecraft/server-ui";

export interface BridgeDescriptor {
  /**
   * Sets the property’s value
   */
  value?: any;

  /**
   * Can the value be changed?
   */
  writeable?: boolean;

  /**
   * Shows in loops/Object.keys()?
   */
  enumerable?: boolean;

  /**
   * Can the property be deleted or modified?
   */
  configurable?: boolean;

  /**
   * A description to show in the docs.
   */
  description?: string;

  /**
   * Function to call when reading the property
   * @returns {any}
   */
  get?: () => any;

  /**
   * Function to call when setting the property
   * @param {any} value
   */
  set?: (value: any) => void;
}

export type bridgeObject = World | Entity;

export class Bridge {
  static readonly all = new Map<string, Bridge>();

  private objects = new Map<string, Map<string, BridgeDescriptor>>();
  readonly addonId: string;
  version: string;
  description?: string | RawMessage;

  /**
   * A new Bridge instance.
   * @param {string} addonId
   */
  constructor(
    addonId: string,
    version?: string,
    description?: string | RawMessage,
  ) {
    this.addonId = addonId;
    this.version = version ?? "1.0.0";
    this.description = description;
    Bridge.all.set(this.addonId, this);
  }

  private get(objectName: string, propertyName: string, data: PacketData) {
    const objDesc = this.objects.get(objectName);
    if (!objDesc) {
      return { error: true, message: `No properties found for ${objectName}` };
    }
    const descriptor = objDesc.get(propertyName);
    if (!descriptor) {
      return {
        error: true,
        message: `Property ${propertyName} not found on ${objectName}`,
      };
    }
    const object = getObject(objectName, data);
    return { error: false, object, descriptor };
  }

  private onReceive_connect(event: PacketReceiveEvent, data: PacketData): void {
    const rData = new PacketData();
    if (this.addonId !== data.get("addon")) {
      rData.set("error", true);
      rData.set("message", "Not found!");
      event.response = rData;
      return;
    }
    rData.set("error", false);
    rData.set("message", "Connected!");
    event.response = rData;
  }

  private onReceive_get(event: PacketReceiveEvent, data: PacketData): void {
    const arg1 = data.get("object");
    const arg2 = data.get("property");
    const res = this.get(arg1, arg2, data);
    const rData = new PacketData();
    rData.set("error", false);
    if (res.error) {
      rData.set("error", true);
      rData.set("message", res.message);
      event.response = rData;
      return;
    }

    if (!res.descriptor || !res.object) return;

    if (res.descriptor.get) {
      rData.set("value", res.descriptor.get());
      event.response = rData;
      return;
    }
    if (arg1 === "World") {
      const v =
        (res.object as World).getDynamicProperty(arg2) ?? res.descriptor.value;
      rData.set("value", v);
      event.response = rData;
      return;
    }
    rData.set("message", `Unsupported object ${arg1}`);
    event.response = rData;
  }

  private onReceive_set(event: PacketReceiveEvent, data: PacketData): void {
    const arg1 = data.get("object");
    const arg2 = data.get("property");
    const arg3 = data.get("value");
    const res = this.get(arg1, arg2, data);
    const rData = new PacketData();
    rData.set("error", false);
    if (res.error) {
      rData.set("error", true);
      rData.set("message", res.message);
      event.response = rData;
      return;
    }

    if (!res.descriptor || !res.object) return;

    if (!res.descriptor.writeable) {
      rData.set("error", true);
      rData.set(
        "message",
        `Property "${arg2}" is not writable on object: ${arg1}`,
      );
      event.response = rData;
      return;
    }

    if (res.descriptor.set) {
      res.descriptor.set(arg3);
      event.response = rData;
      return;
    }

    if (arg1 === "World") {
      (res.object as World).setDynamicProperty(arg2, arg3);
      event.response = rData;
      return;
    }
    rData.set("message", `Unsupported object ${arg1}`);
    event.response = rData;
  }

  private onReceive_has(event: PacketReceiveEvent, data: PacketData): void {
    const arg1 = data.get("object");
    const arg2 = data.get("property");
    const res = this.get(arg1, arg2, data);
    const rData = new PacketData();
    rData.set("value", false);
    if (res.error) {
      rData.set("value", false);
      event.response = rData;
      return;
    }

    if (!res.descriptor || !res.object) {
      rData.set("value", false);
      event.response = rData;
      return;
    }

    rData.set("value", true);
    event.response = rData;
  }

  private onReceive_call(event: PacketReceiveEvent, data: PacketData): void {
    const arg1 = data.get("object");
    const arg2 = data.get("property");
    const res = this.get(arg1, arg2, data);
    const rData = new PacketData();
    rData.set("error", false);
    if (res.error) {
      rData.set("error", true);
      rData.set("message", res.message);
      event.response = rData;
      return;
    }

    if (!res.descriptor || !res.object) return;

    if (!res.descriptor.value || typeof res.descriptor.value !== "function") {
      rData.set("error", true);
      rData.set(
        "message",
        `Property "${arg2}" is not a function on object: ${arg1}`,
      );
      event.response = rData;
      return;
    }

    const output = res.descriptor.value.apply(
      res.object,
      data.get("args") || [],
    );
    rData.set("value", output);

    event.response = rData;
  }

  private onReceive_docs(event: PacketReceiveEvent, data: PacketData): void {
    const rData = new PacketData();
    rData.set("error", false);
    const player = data.readEntity("player");
    if (!player || !(player instanceof Player)) {
      rData.set("error", true);
      rData.set("message", "Player not found!");
      event.response = rData;
      return;
    }
    this.showDocs(player);
    event.response = rData;
  }

  /**
   * Create a new property on an object.
   * @param {bridgeObject} object The object.
   * @param {string} property The property name.
   * @param {BridgeDescriptor} descriptor A descriptor of the property to be added or changed
   * @returns
   */
  defineProperty(
    object: bridgeObject,
    property: string,
    descriptor: BridgeDescriptor,
  ) {
    const k = object.constructor.name;
    let prop = this.objects.get(k);
    if (!prop) {
      prop = new Map();
      prop.set(property, descriptor);
      this.objects.set(k, prop);
      return;
    }
    prop.set(property, descriptor);
  }

  private showProperty(
    player: Player,
    objectName: string,
    propertyName: string,
  ): void {
    const res = this.objects.get(objectName)?.get(propertyName);
    if (!res) return;
    const ui = new ActionFormData();
    ui.title(`${propertyName} (${objectName}) Bridge`);
    const type = res.value != undefined ? typeof res.value : "setter / getter";
    ui.body(
      `${res.description ?? ""}\n\n§lType:§r ${type}\n\n§lWriteable§r: ${res.writeable}\n\n§lEnumerable§r: ${
        res.enumerable
      }\n\n§lConfigurable§r: ${res.configurable}\n\n`,
    );
    ui.show(player);
  }

  private showProperties(player: Player): void {
    const ui = new ActionFormData();
    ui.title(`${this.addonId} Bridge Properties`);
    ui.body(`All properties for ${this.addonId}`);

    const btns: Array<[string, string]> = [];
    for (const [k, v] of this.objects.entries()) {
      for (const [kk, vv] of v) {
        ui.button(`${kk} (${k})`);
        btns.push([k, kk]);
      }
    }

    ui.show(player).then((event: ActionFormResponse) => {
      if (event.canceled) return;
      const btn = btns[event.selection as number];
      this.showProperty(player, btn[0], btn[1]);
    });
  }

  /**
   * Show docs UI for this Add-On bridge.
   * @param {Player} player
   */
  showDocs(player: Player): void {
    const ui = new ActionFormData();
    ui.title(`${this.addonId} Bridge [${this.version}]`);
    ui.body(this.description ?? "");
    ui.button("Properties");
    ui.show(player).then((event: ActionFormResponse) => {
      if (event.canceled) return;
      switch (event.selection) {
        case 0:
          this.showProperties(player);
          break;
      }
    });
  }

  static onReceive(event: PacketReceiveEvent): void {
    const data = event.body as PacketData;
    const addonId = data.get("addon");
    const bridge = Bridge.all.get(addonId);
    if (!bridge) return;
    const methodName = `onReceive_${data.get("method")}`;
    const func = bridge[methodName as keyof Bridge];
    if (typeof func === "function") {
      (func as Function).bind(bridge)(event, data);
    } else {
      console.error(`Method "${methodName}" not found or not a function.`);
    }
  }
}

function setup() {
  PacketEvents.receive.subscribe(Bridge.onReceive, { namespaces: ["bridge"] });
}

setup();
