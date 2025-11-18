import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET /api/investors/crm/tasks - Fetch all tasks
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dealId = searchParams.get('dealId');
    const assignedToId = searchParams.get('assignedToId');
    const status = searchParams.get('status');

    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (dealId) {
      whereConditions.push(`dt."dealId" = $${paramIndex}`);
      queryParams.push(dealId);
      paramIndex++;
    }

    if (assignedToId) {
      whereConditions.push(`dt."assignedToId" = $${paramIndex}`);
      queryParams.push(assignedToId);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`dt.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const tasks = await query(`
      SELECT 
        dt.*,
        jsonb_build_object(
          'id', d.id,
          'name', d.name
        ) as deal,
        jsonb_build_object(
          'id', u.id,
          'firstName', u."firstName",
          'lastName', u."lastName",
          'email', u.email
        ) as "assignedTo"
      FROM "DealTask" dt
      LEFT JOIN "Deal" d ON dt."dealId" = d.id
      LEFT JOIN "User" u ON dt."assignedToId" = u.id
      ${whereClause}
      ORDER BY dt."createdAt" DESC
    `, queryParams);

    return NextResponse.json(tasks);
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/investors/crm/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      dealId,
      title,
      description,
      status,
      priority,
      dueDate,
      assignedToId,
    } = body;

    if (!dealId || !title) {
      return NextResponse.json(
        { error: 'Deal ID and title are required' },
        { status: 400 }
      );
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await query(`
      INSERT INTO deal_tasks (
        id, "dealId", title, description, status, priority, "dueDate", "assignedToId", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    `, [
      taskId,
      dealId,
      title,
      description || null,
      status || 'TODO',
      priority || 'MEDIUM',
      dueDate ? new Date(dueDate) : null,
      assignedToId || null,
    ]);

    // Fetch the created task with relations
    const task = await queryOne(`
      SELECT 
        dt.*,
        jsonb_build_object(
          'id', d.id,
          'name', d.name
        ) as deal,
        jsonb_build_object(
          'id', u.id,
          'firstName', u."firstName",
          'lastName', u."lastName",
          'email', u.email
        ) as "assignedTo"
      FROM deal_tasks dt
      LEFT JOIN deals d ON dt."dealId" = d.id
      LEFT JOIN users u ON dt."assignedToId" = u.id
      WHERE dt.id = $1
    `, [taskId]);

    return NextResponse.json(task, { status: 201 });
  } catch (error: any) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task', details: error.message },
      { status: 500 }
    );
  }
}
