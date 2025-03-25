import axios from "axios";
import * as fs from "fs";
import * as dotenv from "dotenv";
import { createObjectCsvWriter } from "csv-writer";

dotenv.config();

export interface Conversation {
  id: string;
  title: string;
}

interface Message {
  id: string;
  message: string;
  sender: "HUMAN" | "ASSISTANT";
  createdAt: string;
  updatedAt: string;
}

export interface TestResult {
  question: string;
  answer: string;
  conversationId: string;
  timestamp: Date;
}

export class AITestingTool {
  private readonly baseUrl: string;
  private results: TestResult[] = [];
  private readonly jwtToken: string;

  constructor() {
    const jwtToken = process.env.JWT_TOKEN;
    if (!jwtToken) {
      throw new Error("JWT_TOKEN không được định nghĩa trong file .env");
    }
    this.jwtToken = jwtToken;

    this.baseUrl = process.env.BASE_URL || "https://api-dev.copin.io/ai-agent";
  }

  /**
   * Lấy headers cho API request với JWT token
   * @returns Headers object với JWT authentication
   */
  private getAuthHeaders() {
    return {
      Authorization: this.jwtToken,
      "Content-Type": "application/json",
    };
  }

  /**
   * Tạo một conversation mới
   * @param title Tiêu đề của conversation
   * @returns Promise với ID của conversation
   */
  async createConversation(title: string): Promise<string> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/conversations`,
        { title },
        { headers: this.getAuthHeaders() }
      );

      const conversation: Conversation = response.data;
      return conversation.id;
    } catch (error) {
      console.error("Error creating conversation:", error);
      throw error;
    }
  }

  /**
   * Gửi một câu hỏi tới conversation
   * @param conversationId ID của conversation
   * @param message Nội dung câu hỏi
   * @returns Promise với câu trả lời
   */
  async sendMessage(conversationId: string, message: string): Promise<string> {
    try {
      await axios.post(
        `${this.baseUrl}/chat-conversations/${conversationId}/chat`,
        { messageText: message },
        { headers: this.getAuthHeaders() }
      );

      const response = await axios.get(
        `${this.baseUrl}/chat-conversations/${conversationId}/chat/list`,
        { headers: this.getAuthHeaders() }
      );

      const chatResponse: Message[] = response.data;
      const assistantMessage = chatResponse.find(
        (msg) => msg.sender === "ASSISTANT"
      );
      return assistantMessage?.message ?? "No assistant message found";
    } catch (error) {
      console.error(
        `Error sending message to conversation ${conversationId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Xử lý một câu hỏi, tạo conversation và nhận câu trả lời
   * @param question Câu hỏi cần gửi
   * @returns Promise với kết quả test
   */
  async processQuestion(question: string): Promise<TestResult> {
    try {
      const conversationId = await this.createConversation(`Test`);

      const answer = await this.sendMessage(conversationId, question);

      const result: TestResult = {
        question,
        answer,
        conversationId,
        timestamp: new Date(),
      };

      this.results.push(result);
      return result;
    } catch (error) {
      console.error("Error processing question:", error);
      throw error;
    }
  }

  /**
   * Chạy test với nhiều câu hỏi song song
   * @param questions Danh sách câu hỏi
   * @returns Promise với tất cả kết quả
   */
  async runTests(questions: string[]): Promise<TestResult[]> {
    try {
      const promises = questions.map((question) =>
        this.processQuestion(question)
      );

      return await Promise.all(promises);
    } catch (error) {
      console.error("Error running tests:", error);
      throw error;
    }
  }

  /**
   * Lưu kết quả test vào file JSON
   * @param filePath Đường dẫn file để lưu
   */
  saveResults(filePath: string): void {
    try {
      const jsonResults = JSON.stringify(this.results, null, 2);
      fs.writeFileSync(filePath, jsonResults);
      console.log(`Results saved to ${filePath}`);
    } catch (error) {
      console.error("Error saving results:", error);
      throw error;
    }
  }

  /**
   * Xuất kết quả ra file CSV
   * @param filePath Đường dẫn file để xuất
   */
  exportToCSV(filePath: string): void {
    try {
      const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: [
          { id: "question", title: "Question" },
          { id: "answer", title: "Answer" },
          { id: "conversationId", title: "Conversation ID" },
          { id: "timestamp", title: "Timestamp" },
        ],
      });

      // Format data cho CSV
      const records = this.results.map((result) => ({
        question: result.question,
        answer: result.answer,
        conversationId: result.conversationId,
        timestamp: result.timestamp.toISOString(),
      }));

      csvWriter.writeRecords(records).then(() => {
        console.log(`Data exported to CSV: ${filePath}`);
      });
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      throw error;
    }
  }

  /**
   * Xuất kết quả ra file Excel XLSX
   * @param filePath Đường dẫn file để xuất
   */
}
