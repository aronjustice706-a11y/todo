import { Client, Account } from "appwrite";

const client = new Client();
client.setEndpoint("https://fra.cloud.appwrite.io/v1")
      .setProject("68b8fbc7001bfd08a7a4");

export const account = new Account(client);