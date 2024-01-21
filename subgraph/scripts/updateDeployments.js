const path = require("path");
const fs = require("fs");

const chains = {
  mainnet: "mainnet",
  polygon: "matic",
  goerli: "goerli",
  mumbai: "mumbai",
  sepolia: "sepolia"
};

const contractNames = ["TermPoolFactory", "TpToken"];

const update = (chainName) => {
  const contracts = {};

  contractNames.forEach((contractName) => {
    const filePath = path.resolve(
      `../deployments/${chainName}/${contractName}.json`
    );
    const deployment = JSON.parse(
      fs.readFileSync(filePath, { encoding: "utf8" })
    );

    const address = deployment.address;
    const block = deployment?.receipt?.blockNumber;

    contracts[contractName] = { address, block };
  });

  const filePath = path.resolve(`./networks/${chains[chainName]}.json`);

  const network = JSON.parse(fs.readFileSync(filePath, { encoding: "utf8" }));

  contractNames.forEach((contractName) => {
    network[contractName].address = contracts[contractName].address;
    network[contractName].startBlock =
      contracts[contractName].block || network[contractName].startBlock;
  });

  fs.writeFileSync(filePath, JSON.stringify(network, null, 4), "utf8");
};

Object.keys(chains).forEach((chain) => update(chain));
