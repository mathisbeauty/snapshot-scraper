import Web3 from "web3";
import { AbiItem } from "web3-utils";
import abi from "../contracts/abi/stakers-agix.json";
import { post } from "./api-helper";
import { AGIX_STAKING_CONTRACT_ADDRESS } from "./constants";

export const getStakerBalance = (
  address: string,
  blockNumber?: number
): Promise<number | null> | null => {
  const functionAbi: AbiItem = abi.find(
    (func) => func.name === "balances"
  ) as any;
  const outputAbi = functionAbi && functionAbi.outputs;
  if (functionAbi && outputAbi) {
    const web3 = new Web3();
    const functionCall = web3.eth.abi.encodeFunctionCall(functionAbi, [
      address,
    ]);
    return post(AGIX_STAKING_CONTRACT_ADDRESS, functionCall, blockNumber).then(
      (response) => {
        if (response) {
          const stakerBalance = web3.eth.abi.decodeParameters(
            outputAbi,
            response.data.result as string
          )["0"] as any;
          return Number(stakerBalance);
        }
        return null;
      }
    );
  } else {
    return null;
  }
};

export const getAllStakers = (
  blockNumber?: number
): Promise<string[] | null> | null => {
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
