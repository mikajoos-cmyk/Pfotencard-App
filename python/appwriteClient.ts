// In frontend/appwriteClient.ts
import { Client, Account, Databases } from 'appwrite';

export const client = new Client();

client
    .setEndpoint('https://fra.cloud.appwrite.io/v1') // <-- Füge hier deinen ENDPOINT von der Seite ein
    .setProject('68e13fcc003de800cdef');   // <-- Füge hier deine PROJECT_ID von der Seite ein

export const account = new Account(client);
export const databases = new Databases(client);