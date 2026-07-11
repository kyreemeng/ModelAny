import { registerAdapter } from "./engine";
import { getModelById } from "../shared/models";

registerAdapter(getModelById("qwen"));
