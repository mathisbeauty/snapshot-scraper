import Web3 from "web3";
import agiAbiJson from "../../contracts/abi/holders-agi.json";
import { AGI_TOKEN_CONTRACT_ADDRESS } from "../constants";
import { AGIX_FIRST_BLOCK } from "../parameters";

export const getAgiHoldersSnapshots = async (web3: Web3) => {
  const contract = new web3.eth.Contract(
    agiAbiJson as any,
    AGI_TOKEN_CONTRACT_ADDRESS
  );

  const events = await contract.getPastEvents("Transfer", {
    fromBlock: AGIX_FIRST_BLOCK,
  });
};
