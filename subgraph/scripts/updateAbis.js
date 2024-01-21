const path = require("path");
const fs = require("fs");

const importAbi = (name, artifacePath = "") => {
  const sourcePath = path.resolve(
    `../artifacts/contracts/${artifacePath}${name}.sol/${name}.json`
  );
  const artifact = JSON.parse(
    fs.readFileSync(sourcePath, { encoding: "utf8" })
  );

  const destPath = path.resolve(`./abis/${name}.json`);
  fs.writeFileSync(destPath, JSON.stringify(artifact.abi, null, "\t"), "utf8");
};

importAbi("TermPoolFactory");
importAbi("TermPool");
importAbi("TpToken");
