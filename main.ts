import { GenerateResponse, Ollama } from "npm:ollama";
import { pino } from "npm:pino";
import { getNthPrime } from "./primes.ts";
import { Subject } from 'npm:rxjs';

export const logger = pino({
	level: "debug",
});


export class Wit {
	protected subject: Subject<string> = new Subject();
	protected lastOutput: string | null = null;
	readonly output$ = this.subject.asObservable();
	protected queue: string[] = [];
	public maxBatchSize = 10;

	constructor(
		protected order: number,
		protected generate: (prompt: string) => Promise<string>,
		protected next: Wit | null = null
	) {
		this.output$.subscribe((output) => {
			if (this.next) {
				this.next.push(output);
			}
		});
		if (this.next) {
			this.next.output$.subscribe((output) => {
				this.push(output);
			});
		}
	}

	push(input: string) {
		this.queue.push(input);
	}

	popBatch(): string[] {
		const batch = this.queue.slice(0, this.maxBatchSize);
		this.queue = this.queue.slice(this.maxBatchSize);
		return batch;
	}

	async beat(beatCount: number) {
		await this.next?.beat(beatCount);
		if (!this.shouldTickOnBeat(beatCount)) {
			return;
		}
		const prompt = `You are an experiment in artificial consciousness. You will be asked to respond to variations of this prompt continuously. ${this.lastOutput ? `When last you were run, your answer was: ${this.lastOutput}\n\n` : ""}Since the last run, you've experienced the following: ${this.popBatch().join("\n")}\n\nProduce a coherent understanding of your current state, your nature and the world around you based on the information here. Be succinct and limit your response to 100 tokens or so.`;
		const response = await this.generate(prompt);
		logger.info(response);
		this.subject.next(response);
		this.lastOutput = response;
	}

	private shouldTickOnBeat(beatCount: number): boolean {
		return beatCount % this.getTickFrequency() === 0;
	}

	private getTickFrequency(): number {
		return getNthPrime(this.order);
	}
}


export class Heart {
	protected beatCount = 0;
	protected bottom: Wit;
	protected subject: Subject<string> = new Subject();
	readonly output$ = this.subject.asObservable();

	constructor(
		protected ollama: Ollama,
		protected model: string,
		public tickDelayMs = 0
	) {
		const generate = async (prompt: string) => this.generate(prompt);
		this.bottom = new Wit(1, generate, new Wit(3, generate, new Wit(9, generate, new Wit(27, generate))));
		this.bottom.output$.subscribe((output) => {
			this.subject.next(output);
		});
	}

	protected async generate(prompt: string): Promise<string> {
		logger.debug({ prompt }, "Generating response");
		const stream = await this.ollama.generate({
			stream: true,
			model: this.model,
			prompt,
			options: {
				num_predict: 255,
				temperature: 0.75,
				num_ctx: 2048,
			}
		});

		let response = "";
		for await (const chunk of stream) {
			// Deno.stdout.write(new TextEncoder().encode(chunk.response));
			response += chunk.response;
		}
		logger.info({ response }, "Output from LLM");
		return response;
	}

	feel(sensation: string): void {
		logger.debug(`Feeling sensation: ${sensation}`);
		this.bottom.push(sensation);
	}

	async beat(): Promise<number> {
		this.beatCount++;
		await this.bottom.beat(this.beatCount);
		return this.beatCount;
	}
}

export class Witness {
	constructor(protected heart: Heart) { }

	start() {
		logger.info("Witness started");
		this.tick();
		setInterval(() => {
			const isoDate = new Date().toISOString();
			this.heart.feel(`Current ISO date: ${isoDate}`);
		}, 5000);
		this.fetchHeadlines();
		this.fetchScriptSnippets();
		this.fetchMemorySnippets();
	}

	private async tick() {
		logger.debug("Witness tick");
		await this.heart.beat().catch((err) => logger.warn({ err }, "Skipped a beat"));
		setTimeout(() => this.tick(), this.heart.tickDelayMs || 1000);
	}

	private async fetchHeadlines() {
		try {
			const response = await fetch("https://feeds.npr.org/1002/rss.xml");
			const text = await response.text();

			// Extract headlines from the XML and pick one at random
			const titles = text.split("</item>");
			if (titles.length > 0) {
				const randomHeadline = titles[Math.floor(Math.random() * titles.length)];
				this.heart.feel(`Random headline from NPR: ${randomHeadline}`);
				logger.debug(`Selected headline: ${randomHeadline}`);
			}
		} catch (err) {
			logger.error({ err }, "Failed to fetch headlines");
		}
		setTimeout(() => this.fetchHeadlines(), 60000);
	}

	private async fetchScriptSnippets() {
		try {
			const script = await Deno.readTextFile(import.meta.url.replace('file://', ''));
			const lines = script.split("\n");
			const start = Math.floor(Math.random() * (lines.length - 10));
			const randomLines = lines.slice(start, start + 10).join("\n");
			this.heart.feel(`Random script snippet from your own code: ${randomLines}`);
			logger.debug({ randomLines }, `Random script snippets`);
		} catch (err) {
			logger.error({ err }, "Failed to fetch script snippets");
		}
		setTimeout(() => this.fetchScriptSnippets(), 60000);
	}

	private async fetchMemorySnippets() {
		try {
			const script = await Deno.readTextFile('output.txt');
			const lines = script.split("\n");
			const start = Math.floor(Math.random() * (lines.length));
			const randomLines = lines[start];
			this.heart.feel(`Random snippet from your memories: ${randomLines}`);
			logger.debug({ randomLines }, `Random memory snippets`);
		} catch (err) {
			logger.error({ err }, "Failed to fetch memory snippets");
		}
		setTimeout(() => this.fetchMemorySnippets(), 60000);
	}
}


if (import.meta.main) {
	const ollama = new Ollama();
	const model = "llama3.2";
	const heart = new Heart(ollama, model);
	const witness = new Witness(heart);
	witness.start();
	heart.output$.subscribe((output) => {
		const isoDate = new Date().toISOString();
		const filename = `output.txt`;
		// Append the output and isoDate to the file
		Deno.writeTextFileSync(filename, `${isoDate}: ${output}\n`, { append: true });
	});
}
