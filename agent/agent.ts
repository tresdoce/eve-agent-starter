import { openai } from "@ai-sdk/openai";
import { defineAgent } from "eve";
import { config } from "../src/config/index.js";

export default defineAgent({
  model: openai(config.openai.model),
});
