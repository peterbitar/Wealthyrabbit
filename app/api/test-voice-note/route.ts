import { NextResponse } from 'next/server';
import { sendInAppNotification } from '@/lib/in-app-notifications';
import { generateAndStoreVoiceNotes } from '@/lib/voice-notes';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    console.log('🧪 Testing voice note generation and storage...');

    // Test message
    const teaser = 'TSLA is up 5% today on strong earnings.';
    const voiceNoteTexts = [
      'Tesla stock jumped 5% today after reporting better-than-expected quarterly earnings.',
    ];

    // Generate and store voice notes
    console.log(`🎤 Generating ${voiceNoteTexts.length} voice note(s)...`);
    const voiceNoteUrls = await generateAndStoreVoiceNotes(voiceNoteTexts);
    console.log(`✅ Generated voice notes: ${JSON.stringify(voiceNoteUrls)}`);

    // Send in-app notification
    console.log('📱 Sending in-app notification...');
    const result = await sendInAppNotification(userId, teaser, voiceNoteUrls);
    console.log(`✅ In-app notification sent: ${JSON.stringify(result)}`);

    return NextResponse.json({
      success: true,
      message: 'Voice note test completed',
      voiceNoteUrls,
      notificationResult: result,
    });
  } catch (error: any) {
    console.error('❌ Voice note test failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
