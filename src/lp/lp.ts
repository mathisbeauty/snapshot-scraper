import lpAbiJson from "../../contracts/abi/lp-agix-eth.json";
import { AGIX_ETH_PAIR_CONTRACT_ADDRESS } from "../constants";
import Web3 from "web3";

export const getLpSnapshots = async (web3: Web3) => {
  const contract = new web3.eth.Contract(
    lpAbiJson as any,
    AGIX_ETH_PAIR_CONTRACT_ADDRESS
  );

  const events = await contract.getPastEvents("Mint", {
    fromBlock: "12561147",
  });
};
