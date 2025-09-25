import RESOLVER_ABI from "../abis/l2-resolver.abi";
import { EventListener } from "./listeners/listener";
import { encodeFunctionData, Hash, namehash, parseAbi } from "viem";

const listener = new EventListener();
listener.start();