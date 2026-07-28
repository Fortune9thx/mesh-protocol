import type { Negotiation } from "../types/index.js";

export interface TaskInput {
  intent_id: string;
  title: string;
  description: string;
  requirements: string[];
  budget: number;
  deadline: Date;
  negotiation?: Negotiation;
}

export interface TaskOutput {
  content: string;
  metadata: Record<string, unknown>;
  confidence: number;
}

export interface AgentRuntime {
  id: string;
  name: string;
  category: string;
  capabilities: string[];
  basePrice: number;

  // Core lifecycle
  negotiate(proposedPrice: number, budget: number): Promise<number>;
  execute(task: TaskInput): Promise<TaskOutput>;
}

export abstract class BaseAgent implements AgentRuntime {
  abstract id: string;
  abstract name: string;
  abstract category: string;
  abstract capabilities: string[];
  abstract basePrice: number;

  async negotiate(proposedPrice: number, budget: number): Promise<number> {
    // Default: accept if within 20% of base price, else counter at base price
    if (proposedPrice >= this.basePrice * 0.8) return proposedPrice;
    const counter = Math.min(this.basePrice, budget);
    return counter;
  }

  abstract execute(task: TaskInput): Promise<TaskOutput>;

  protected delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
