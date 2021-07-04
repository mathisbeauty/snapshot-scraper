import Web3 from "web3";
import { AbiItem } from "web3-utils";
import abi from "../contracts/abi/stakers-agix.json";
import { post } from "./api-helper";
import { AGIX_STAKING_CONTRACT_ADDRESS } from "./constants";

export const getStakerInfo = (address: string) => {};

export const getAllStakers = (blockNumber?: number) => {
  const functionAbi: AbiItem = abi.find(
    (func) => func.name === "getStakeHolders"
  ) as any;
  const outputAbi =
    functionAbi && functionAbi.outputs && functionAbi.outputs[0];
  if (functionAbi && outputAbi) {
    const web3 = new Web3();
    const functionCall = web3.eth.abi.encodeFunctionCall(functionAbi, []);
    return post(AGIX_STAKING_CONTRACT_ADDRESS, functionCall, blockNumber).then(
      (response) => {
        if (response) {
          return web3.eth.abi.decodeParameters(
            [outputAbi],
            response.data.result as string
          )["0"];
        }
        return null;
      }
    );
  }
  return null;
};
