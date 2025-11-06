/**
 * Voice Note Storage
 * Handles generation and storage of voice notes for in-app notifications
 */

import { put } from '@vercel/blob';
import { generateVoiceNote } from './telegram';

/**
 * Generate voice note and upload to Vercel Blob storage
 * @param text - Text to convert to speech
 * @param filename - Optional filename (will generate if not provided)
 * @returns URL to the stored voice note
 */
export async function generateAndStoreVoiceNote(
  text: string,
  filename?: string
): Promise<string> {
  try {
    // Generate voice note audio
    const audioBuffer = await generateVoiceNote(text);

    // Generate filename if not provided
    if (!filename) {
      const timestamp = Date.now();
      const hash = text.substring(0, 10).replace(/[^a-zA-Z0-9]/g, '');
      filename = `voice-notes/${timestamp}-${hash}.ogg`;
    }

    // Upload to Vercel Blob
    const blob = await put(filename, audioBuffer, {
      access: 'public',
      contentType: 'audio/ogg',
    });

    console.log(`🎤 Voice note stored: ${blob.url}`);
    return blob.url;
  } catch (error) {
    console.error('Error generating and storing voice note:', error);
    throw error;
  }
}

/**
 * Generate and store multiple voice notes
 * @param texts - Array of texts to convert
 * @returns Array of URLs to the stored voice notes
 */
export async function generateAndStoreVoiceNotes(
  texts: string[]
): Promise<string[]> {
  try {
    const urls = await Promise.all(
      texts.map((text, index) =>
        generateAndStoreVoiceNote(text, `voice-notes/${Date.now()}-${index}.ogg`)
      )
    );
    return urls;
  } catch (error) {
    console.error('Error generating and storing voice notes:', error);
    return []; // Return empty array on error, don't fail the notification
  }
}
