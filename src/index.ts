import { AITestingTool } from "./ai-testing-tool";
import * as path from "path";
import * as fs from "fs";

async function main() {
  try {
    const tester = new AITestingTool();

    const filePath = path.join(__dirname, "../questions/question2503.txt");

    const fileContent = fs.readFileSync(filePath, "utf-8");

    const questions: string[] = fileContent
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    console.log("List of questions:", questions);

    console.log("Starting AI tests...");

    const results = await tester.runTests(questions);

    results.forEach((result, index) => {
      console.log(`\n----- Question ${index + 1} -----`);
      console.log(`Q: ${result.question}`);
      console.log(`A: ${result.answer}`);
      console.log(`Conversation ID: ${result.conversationId}`);
    });

    const resultsDir = "results";
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir);
    }

    tester.saveResults(path.join(resultsDir, `question2503.json`));
    tester.exportToCSV(path.join(resultsDir, `question2503.csv`));

    console.log("\nAll test results have been exported successfully!");
  } catch (error) {
    console.error("Test execution failed:", error);
    process.exit(1);
  }
}

main();
