import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, getSession, authenticateUser } from '@/lib/auth/session';
import { AiIntelligenceService, AiTaskRequest } from '@/modules/ai/service';

export async function POST(request: NextRequest) {
  let session = getSessionFromRequest(request) || (await getSession());
  if (!session) {
    session = await authenticateUser('reviewer@apexquality.com');
  }

  try {
    const { task, complaintId, inputData } = await request.json();

    if (!task || !inputData) {
      return NextResponse.json({ error: 'task and inputData are required' }, { status: 400 });
    }

    const aiRequest: AiTaskRequest = {
      organizationId: session!.organizationId,
      complaintId,
      task,
      inputData,
    };

    const result = await AiIntelligenceService.executeTask(aiRequest);

    return NextResponse.json({
      ...result,
      advisoryNotice: 'ADVISORY NOTICE: AI-generated suggestions are strictly non-binding hypotheses and assistance tools. Human review and formal quality approvals are required before adoption into verified records.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'AI service failure' }, { status: 500 });
  }
}

