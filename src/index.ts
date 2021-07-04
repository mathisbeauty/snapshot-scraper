import { getAllStakers } from "./stakers";

if (process.env.INFURA_PROJECT_URL === undefined) {
  console.error("Please define the URL for the Infura project");
  process.exit(1);
}

(async () => {
  console.log("hello world", await getAllStakers());
})();
