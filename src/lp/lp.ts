import lpAbiJson from "../../contracts/abi/lp-agix-eth.json";
import { AGIX_ETH_PAIR_CONTRACT_ADDRESS } from "../constants";
import Web3 from "web3";

export const getLpSnapshots = async () => {
  const web3 = new Web3(
    new Web3.providers.HttpProvider(process.env.INFURA_PROJECT_URL as string)
  );
  const contract = new web3.eth.Contract(
    lpAbiJson as any,
    AGIX_ETH_PAIR_CONTRACT_ADDRESS
  );

  const events = await contract.getPastEvents("Mint", {
    fromBlock: "12561147",
  });
  console.log(events);
  // return callContractFunc(lpAbiJson, AGIX_ETH_PAIR_CONTRACT_ADDRESS, '', [])
};
