# @lpsmods/mcaddon-bridge

![Version](https://shields.io/npm/v/@lpsmods/mcaddon-bridge)
[![Downloads](https://shields.io/npm/dm/@lpsmods/mcaddon-bridge)](https://www.npmjs.com/package/@lpsmods/mcaddon-bridge)
[![Issues](https://img.shields.io/github/issues/lpsmods/mcaddon-bridge)](https://github.com/lpsmods/mcaddon-bridge/issues)

A package to communicate between Minecraft Add-Ons.

## Dependencies

```json
[
  { "module_name": "@minecraft/server", "version": "2.1.0" },
  { "module_name": "@minecraft/server-ui", "version": "2.0.0" }
]
```

## Features

- Send data between Add-Ons using packets.
- Create your own API bridge for other Add-Ons!

## Example

Create the api.

```ts
import { world } from "@minecraft/server";
import { Bridge } from "@lpsmods/mcaddon-bridge";

// Create a new bridge (aka API)
const api = new Bridge("com.example.myPack");

// Basic property
api.defineProperty(world, "name", {
  value: "Steve",
  writeable: true,
  enumerable: true,
  configurable: true,
});

// Getter and Setter
api.defineProperty(world, "fullName", {
  get() {
    const firstName = this.getDynamicProperty("first_name");
    const lastName = this.getDynamicProperty("last_name");
    return `${firstName} ${lastName}`;
  },

  set(value) {
    const parts = value.split(" ");
    this.setDynamicPropery("first_name", parts[0]);
    this.setDynamicPropery("last_name", parts[1]);
  },
  enumerable: true,
  configurable: true,
});

// Simple function property
api.defineProperty(world, "greet", {
  value: function (name: string) {
    console.warn(`Hello, ${name}!`);
  },
  writeable: true,
  enumerable: true,
  configurable: true,
});
```

Use the API from a different pack.

```ts
import { world } from "@minecraft/server";
import { connect } from "@lpsmods/mcaddon-bridge";

function worldLoad() {
  // Connect to the api
  const myPack = connect("com.example.myPack");

  console.warn(myPack.get(world, "name"));
  myPack.set(world, "name", "Bob");
  console.warn(myPack.get(world, "name"));

  console.warn(myPack.get(world, "fullName"));
  myPack.set(world, "fullName", "Steve Black");
  console.warn(myPack.get(world, "fullName"));

  myPack.call(world, "greet", "Alex");
}

world.afterEvents.worldLoad.subscribe(worldLoad);
```

> Not associated with or approved by Mojang Studios or Microsoft
