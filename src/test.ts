import { world } from "@minecraft/server";
import { Bridge } from "./bridge";
import { connect } from "./connect";

const api = new Bridge("com.example.mypack");

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

// Usage
const myPack = connect("com.example.mypack");
console.warn(myPack.get(world, "name"));
myPack.set(world, "name", "Bob");
console.warn(myPack.get(world, "name"));

console.warn(myPack.get(world, "fullName"));
myPack.set(world, "fullName", "Steve Black");
console.warn(myPack.get(world, "fullName"));

myPack.call(world, "greet", "Alex");
