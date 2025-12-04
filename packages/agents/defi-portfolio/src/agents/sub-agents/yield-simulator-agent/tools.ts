import { createTool } from "@iqai/adk";
import { 
    StrategyLeverageABI, 
    StrategyAaveV3ABI, 
    VaultABI, 
    StrategyRouterABI,
    PoolABI
  } from "../../shared/abi";
import { chain_read, chain_write, toStringBN } from "../../shared/utils/chain";
import { env } from "../../../env";

export const yield_generator = createTool({
    name: "yield_generator",
    description: "Accrues interest in the mock pool.",
    fn: async () => {
      const linkTx = await chain_write(
        env.MOCK_AAVE_POOL_ADDRESS,
        PoolABI.abi,
        "accrue",
        [env.LINK_ADDRESS]
      );
  
      return toStringBN({
        message: "Yield Accrued Successfully!",
        txHash: linkTx.hash
      });
    }
  });