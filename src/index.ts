import { getAllStakers, getStakerBalance } from "./stakers";

if (process.env.INFURA_PROJECT_URL === undefined) {
  console.error("Please define the URL for the Infura project");
  process.exit(1);
}

(async () => {
  // 0 = latest
  const blockNumbers = [0];

  for (const blockNumber of blockNumbers) {
    const stakers = await getAllStakers(blockNumber);

    const balanceSnapshots: { [block: number]: { [address: string]: number } } =
      {};

    if (stakers) {
      if (stakers.length > 0) {
        const stakerBalance = await getStakerBalance(stakers[0], blockNumber);
        if (stakerBalance) {
          balanceSnapshots[0] = {};
          balanceSnapshots[0][stakers[0]] = stakerBalance;
          console.log(balanceSnapshots);
        }
      }
    }
  }
})();
