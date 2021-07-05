import Web3 from "web3";
import agixAbiJson from "../../contracts/abi/holders-agix.json";
import { AGIX_TOKEN_CONTRACT_ADDRESS } from "../constants";
import { AGIX_FIRST_BLOCK } from "../parameters";

export const getAgixSnapshots = async (web3: Web3) => {
  const contract = new web3.eth.Contract(
    agixAbiJson as any,
    AGIX_TOKEN_CONTRACT_ADDRESS
  );

  const events = await contract.getPastEvents("Transfer", {
    fromBlock: AGIX_FIRST_BLOCK,
  });
};
