import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for demo (would be database in production)
const specifications = new Map<string, any>();

// Helper to create empty specification
function createEmptySpecification(workItemId: string) {
  return {
    id: `spec-${workItemId}`,
    workItemId,
    sections: {
      requirements: { content: '', status: 'empty', wordCount: 0, lastUpdated: new Date().toISOString() },
      design: { content: '', status: 'empty', wordCount: 0, lastUpdated: new Date().toISOString() },
      frontend: { content: '', status: 'empty', wordCount: 0, lastUpdated: new Date().toISOString() },
      backend: { content: '', status: 'empty', wordCount: 0, lastUpdated: new Date().toISOString() },
      integration: { content: '', status: 'empty', wordCount: 0, lastUpdated: new Date().toISOString() },
      test: { content: '', status: 'empty', wordCount: 0, lastUpdated: new Date().toISOString() },
    },
    overallStatus: 'empty',
    completionPercentage: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// GET /api/specifications/[workItemId]
export async function GET(
  request: NextRequest,
  { params }: { params: { workItemId: string } }
) {
  try {
    const { workItemId } = params;

    // Get existing or create new specification
    let specification = specifications.get(workItemId);

    if (!specification) {
      specification = createEmptySpecification(workItemId);
      specifications.set(workItemId, specification);
    }

    return NextResponse.json({ data: specification });
  } catch (error) {
    console.error('Error getting specification:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve specification' },
      { status: 500 }
    );
  }
}

// PUT /api/specifications/[workItemId]
export async function PUT(
  request: NextRequest,
  { params }: { params: { workItemId: string } }
) {
  try {
    const { workItemId } = params;
    const body = await request.json();

    // Update the specification
    const updatedSpec = {
      ...body,
      workItemId,
      updatedAt: new Date().toISOString()
    };

    specifications.set(workItemId, updatedSpec);

    return NextResponse.json({ data: updatedSpec });
  } catch (error) {
    console.error('Error updating specification:', error);
    return NextResponse.json(
      { error: 'Failed to update specification' },
      { status: 500 }
    );
  }
}

// PATCH /api/specifications/[workItemId]/sections/[sectionName]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { workItemId: string } }
) {
  try {
    const { workItemId } = params;
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const sectionName = pathParts[pathParts.length - 1];

    const validSections = ['requirements', 'design', 'frontend', 'backend', 'integration', 'test'];

    if (!validSections.includes(sectionName)) {
      return NextResponse.json(
        { error: `Invalid section name. Must be one of: ${validSections.join(', ')}` },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Get current specification
    let currentSpec = specifications.get(workItemId);

    if (!currentSpec) {
      currentSpec = createEmptySpecification(workItemId);
    }

    // Update the specific section
    const updatedSpec = {
      ...currentSpec,
      sections: {
        ...currentSpec.sections,
        [sectionName]: {
          ...body,
          lastUpdated: new Date().toISOString()
        }
      },
      updatedAt: new Date().toISOString()
    };

    specifications.set(workItemId, updatedSpec);

    return NextResponse.json({ data: updatedSpec.sections[sectionName] });
  } catch (error) {
    console.error('Error updating specification section:', error);
    return NextResponse.json(
      { error: 'Failed to update specification section' },
      { status: 500 }
    );
  }
}