import { LlmAgent } from "@iqai/adk";
import { yield_generator } from "./tools";
import { env, model } from "../../../env";

export async function getYieldGeneratorAgent() {
    return new LlmAgent({
        name: "yield_generator_agent",
        description: "Generating or Accruing Yield to the Pool.",
        instruction: "use the tool accrueInterest for accruing yield or interest to the pool for generating profits to the vault.",
        model: model,
        tools: [yield_generator]
    });
}