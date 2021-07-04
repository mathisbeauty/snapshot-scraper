import axios, { AxiosResponse } from "axios";

export const post = (
  contract: string,
  data: string,
  blockNumber?: number,
  id?: number
) => {
  return new Promise<AxiosResponse<any> | null>((resolve, reject) => {
    if (process.env.INFURA_PROJECT_URL) {
      resolve(
        axios.post(process.env.INFURA_PROJECT_URL, {
          jsonrpc: "2.0",
          method: "eth_call",
          params: [
            {
              to: contract,
              data,
            },
            `${blockNumber || "latest"}`,
          ],
          id: id || 1,
        })
      );
    } else {
      reject();
    }
  });
};
