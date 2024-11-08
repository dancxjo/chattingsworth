export function isPrime(num: number): boolean {
    if (num < 2) return false;
    for (let i = 2; i * i <= num; i++) {
        if (num % i === 0) return false;
    }
    return true;
}

const primes: number[] = [2, 3];

export function getNthPrime(n: number): number {
    if (n < 1) {
        return 1;
    }

    // If the prime is already calculated, return it from the cache
    if (n <= primes.length) {
        return primes[n - 1];
    }

    let num = primes[primes.length - 1] + 2;

    while (primes.length < n) {
        if (isPrime(num)) {
            primes.push(num);
        }
        num++;
    }

    return primes[n - 1];
}
