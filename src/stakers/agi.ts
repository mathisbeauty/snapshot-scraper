import Web3 from "web3";
import { AbiItem } from "web3-utils";
import { post } from "../helpers/api-helper";
import { AGI_STAKING_CONTRACT_ADDRESS } from "../constants";
import agiAbi from "../../contracts/abi/stakers-agi.json";

const abiAndAddress = {
  contractAddress: AGI_STAKING_CONTRACT_ADDRESS,
  abi: agiAbi,
};

const { abi, contractAddress } = abiAndAddress;

export const getStakePeriod = (stakeMapIndex: number, blockNumber?: number) => {
  const functionAbi: AbiItem = abi.find(
    (func) => func.name === "stakeMap"
  ) as any;
  const outputAbi = functionAbi && functionAbi.outputs;
  if (functionAbi && outputAbi) {
    const web3 = new Web3();
    const functionCall = web3.eth.abi.encodeFunctionCall(functionAbi, [
      `${stakeMapIndex}`,
    ]);
    return post(contractAddress, functionCall, blockNumber).then((response) => {
      if (response) {
        const stakePeriod = web3.eth.abi.decodeParameters(
          outputAbi,
          response.data.result as string
        );
        console.log(stakePeriod);
        return stakePeriod;
      }
      return null;
    });
  }
};

// export const getStakersSnapshots = (blockNumber?: number) => {
//   const currentStakeMapIndexAbi: AbiItem = abi.find(
//     (func) => func.name === "currentStakeMapIndex"
//   ) as any;
//   const functionAbi: AbiItem = abi.find(
//     (func) => func.name === "getStakeHolders"
//   ) as any;
//   const outputAbi =
//     functionAbi && functionAbi.outputs && functionAbi.outputs[0];
//   if (functionAbi && outputAbi && currentStakeMapIndexAbi) {
//     const web3 = new Web3();
//     const currentStakeMapIndexFunction = web3.eth.abi.encodeFunctionCall(
//       currentStakeMapIndexAbi,
//       []
//     );
//   const currentStakeMapIndexPromise = post(
//     contractAddress,
//     currentStakeMapIndexFunction,
//     blockNumber
//   );
//   return currentStakeMapIndexPromise.then((currentStakeMapIndexRes) => {
//     const currentStakeMapIndex = Number(
//       web3.eth.abi.decodeParameters(
//         [
//           {
//             name: "",
//             type: "uint256",
//           },
//         ],
//         currentStakeMapIndexRes?.data.result
//       )["0"]
//     );
//     const functionCall = web3.eth.abi.encodeFunctionCall(functionAbi, [
//       `${currentStakeMapIndex}`,
//     ]);
//     return post(contractAddress, functionCall, blockNumber).then((response) => {
//       if (response) {
//         const stakers = web3.eth.abi.decodeParameters(
//           [outputAbi],
//           response.data.result as string
//         )["0"];
//         return stakers;
//       }
//       return null;
//     });
//   });
// };
