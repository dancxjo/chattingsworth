import { expect } from "jsr:@std/expect";
import { getNthPrime } from "./primes.ts";

Deno.test("get 1 in the 0th position", () => {
    const result = getNthPrime(0);
    expect(result).toBe(1);
});

Deno.test("get 2 in the first position", () => {
    const result = getNthPrime(1);
    expect(result).toBe(2);
});

Deno.test("get 3 in the second position", () => {
    const result = getNthPrime(1);
    expect(result).toBe(2);
});

Deno.test("get 23 in the 9th position", () => {
    const result = getNthPrime(9);
    expect(result).toBe(23);
});