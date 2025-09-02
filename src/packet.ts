import {
  Block,
  BlockPermutation,
  Entity,
  ScriptEventCommandMessageAfterEvent,
  system,
  world,
} from "@minecraft/server";

export class PacketData {
  readonly data: { [key: string]: any };

  constructor(data?: {}) {
    this.data = data ?? {};
  }

  toString(): string {
    return JSON.stringify(this.data);
  }

  isEmpty(): boolean {
    return Object.keys(this.data).length === 0;
  }

  get(name: string): any {
    return this.data[name];
  }

  set(name: string, value: any): void {
    this.data[name] = value;
  }

  writeBlockPermutation(name: string, value: BlockPermutation): PacketData {
    this.set(name, {
      type: "block_permutation",
      blockName: value.type.id,
      states: value.getAllStates(),
    });
    return this;
  }

  readBlockPermutation(name: string): BlockPermutation | undefined {
    const prop = this.get(name);
    return BlockPermutation.resolve(prop.blockName, prop.states);
  }

  writeDate(name: string, value: Date): PacketData {
    this.set(name, { type: "date", timestamp: value.getTime() });
    return this;
  }

  readDate(name: string): Date | undefined {
    const prop = this.get(name);
    return new Date(prop.timestamp);
  }

  writeBlock(name: string, value: Block): PacketData {
    this.set(name, {
      type: "block",
      dimension: value.dimension.id,
      x: value.x,
      y: value.y,
      z: value.z,
    });
    return this;
  }

  readBlock(name: string): Block | undefined {
    const prop = this.get(name);
    const dim = world.getDimension(prop.dimension);
    if (!dim) return;
    return dim.getBlock({ x: prop.x, y: prop.y, z: prop.z });
  }

  writeEntity(name: string, value: Entity): PacketData {
    this.set(name, { type: "entity", id: value.id });
    return this;
  }

  readEntity(name: string): Entity | undefined {
    const prop = this.get(name);
    return world.getEntity(prop.id);
  }
}

export class PacketEvent {
  readonly id: string;
  readonly body: PacketData;

  constructor(id: string, body: PacketData) {
    this.id = id;
    this.body = body;
  }
}

export class PacketReceiveEvent extends PacketEvent {
  response: any;

  constructor(id: string, body: PacketData, response?: any) {
    super(id, body);
    this.response = response ?? null;
  }
}

export interface PacketReceiveEventOptions {
  namespaces?: string[];
}

export interface PacketListener {
  callback: (event: PacketReceiveEvent) => void;
  options?: PacketReceiveEventOptions;
}

export class PacketReceiveEventSignal {
  listeners: PacketListener[] = [];

  constructor() {}

  subscribe(
    callback: (event: PacketReceiveEvent) => void,
    options?: PacketReceiveEventOptions,
  ): (event: PacketReceiveEvent) => void {
    this.listeners.push({ callback, options });
    return callback;
  }

  unsubscribe(callback: (event: PacketReceiveEvent) => void): void {
    this.listeners = this.listeners.filter((fn) => fn.callback !== callback);
  }

  apply(event: PacketReceiveEvent): void {
    for (const fn of this.listeners) {
      try {
        fn.callback(event);
      } catch (err) {
        console.error(err);
      }
    }
  }
}

export class Packet {
  private static responses = new Map<string, any>();

  static send(
    identifier: string,
    data: PacketData,
    timeout: number = 20,
  ): Promise<any> {
    const pId = `packet:${system.currentTick}`;
    const payload = JSON.stringify({
      headers: { id: identifier, type: "request" },
      body: data instanceof PacketData ? data.data : data,
    });
    const k = pId.toString();
    system.sendScriptEvent(pId, payload);
    return new Promise((resolve, reject) => {
      let c = 0;
      const runId = system.runInterval(() => {
        c++;
        if (c >= timeout) {
          reject(`Packet '${identifier}' timed out!`);
          return system.clearRun(runId);
        }

        if (Packet.responses.has(k)) {
          const data = Packet.responses.get(k);
          Packet.responses.delete(k);
          resolve(data);
          return system.clearRun(runId);
        }
      });
    });
  }

  static packetReceive(event: ScriptEventCommandMessageAfterEvent): void {
    const data = JSON.parse(event.message);
    const pData = new PacketData(data.body);
    const id = data.headers.id;

    switch (data.headers.type) {
      case "request": // dst
        const pEvent = new PacketReceiveEvent(id.toString(), pData);
        PacketEvents.receive.apply(pEvent);
        if (!pEvent.response) return;
        const payload = JSON.stringify({
          headers: { id: id.toString(), type: "response" },
          body:
            pEvent.response instanceof PacketData
              ? pEvent.response.data
              : pEvent.response,
        });
        system.sendScriptEvent(event.id, payload);
        return;
      case "response": // src
        Packet.responses.set(event.id, pData);
        return;
      default:
        throw new Error(`'${data.headers.type}' is not a valid packet type!`);
    }
  }
}

export class PacketEvents {
  /**
   * This event fires when a packet is received.
   */
  static readonly receive = new PacketReceiveEventSignal();
}

function setup() {
  system.afterEvents.scriptEventReceive.subscribe(Packet.packetReceive, {
    namespaces: ["packet"],
  });
}

setup();
