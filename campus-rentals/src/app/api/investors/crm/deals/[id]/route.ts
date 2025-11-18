import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET /api/investors/crm/deals/[id] - Fetch a single deal
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Fetch deal with all relations
    const deal = await queryOne(`
      SELECT 
        d.*,
        jsonb_build_object(
          'id', p.id,
          'name', p.name,
          'description', p.description,
          'isDefault', p."isDefault",
          'isActive', p."isActive",
          'stages', COALESCE(
            (SELECT jsonb_agg(
              jsonb_build_object(
                'id', s.id,
                'name', s.name,
                'order', s.order,
                'color', s.color
              ) ORDER BY s.order ASC
            ) FROM deal_pipeline_stages s WHERE s."pipelineId" = p.id AND s."isActive" = true),
            '[]'::jsonb
          )
        ) as pipeline,
        jsonb_build_object(
          'id', s2.id,
          'name', s2.name,
          'order', s2.order,
          'color', s2.color
        ) as stage,
        jsonb_build_object(
          'id', prop.id,
          'propertyId', prop."propertyId",
          'name', prop.name,
          'address', prop.address,
          'photos', COALESCE(
            (SELECT jsonb_agg(
              jsonb_build_object(
                'id', ph.id,
                'url', ph.url,
                'displayOrder', ph."displayOrder"
              ) ORDER BY ph."displayOrder" ASC
            ) FROM property_photos ph WHERE ph."propertyId" = prop.id LIMIT 1),
            '[]'::jsonb
          )
        ) as property,
        jsonb_build_object(
          'id', u.id,
          'firstName', u."firstName",
          'lastName', u."lastName",
          'email', u.email
        ) as "assignedTo",
        COALESCE(
          (SELECT jsonb_agg(
            jsonb_build_object(
              'id', dt.id,
              'title', dt.title,
              'description', dt.description,
              'status', dt.status,
              'priority', dt.priority,
              'dueDate', dt."dueDate",
              'assignedToId', dt."assignedToId",
              'assignedTo', jsonb_build_object(
                'id', u2.id,
                'firstName', u2."firstName",
                'lastName', u2."lastName",
                'email', u2.email
              ),
              'createdAt', dt."createdAt",
              'updatedAt', dt."updatedAt"
            ) ORDER BY dt."createdAt" DESC
          ) FROM deal_tasks dt
          LEFT JOIN users u2 ON dt."assignedToId" = u2.id
          WHERE dt."dealId" = d.id),
          '[]'::jsonb
        ) as tasks,
        COALESCE(
          (SELECT jsonb_agg(
            jsonb_build_object(
              'id', dn.id,
              'content', dn.content,
              'isPrivate', dn."isPrivate",
              'createdById', dn."createdById",
              'createdBy', jsonb_build_object(
                'id', u3.id,
                'firstName', u3."firstName",
                'lastName', u3."lastName",
                'email', u3.email
              ),
              'createdAt', dn."createdAt",
              'updatedAt', dn."updatedAt"
            ) ORDER BY dn."createdAt" DESC
          ) FROM deal_notes dn
          LEFT JOIN users u3 ON dn."createdById" = u3.id
          WHERE dn."dealId" = d.id),
          '[]'::jsonb
        ) as notes,
        COALESCE(
          (SELECT jsonb_agg(
            jsonb_build_object(
              'id', dr.id,
              'contactId', dr."contactId",
              'userId', dr."userId",
              'contact', c.*,
              'user', jsonb_build_object(
                'id', u4.id,
                'firstName', u4."firstName",
                'lastName', u4."lastName",
                'email', u4.email
              )
            )
          ) FROM deal_relationships dr
          LEFT JOIN contacts c ON dr."contactId" = c.id
          LEFT JOIN users u4 ON dr."userId" = u4.id
          WHERE dr."dealId" = d.id),
          '[]'::jsonb
        ) as relationships,
        COALESCE(
          (SELECT jsonb_agg(
            jsonb_build_object('id', dt2.id, 'tag', dt2.tag)
          ) FROM deal_tags dt2 WHERE dt2."dealId" = d.id),
          '[]'::jsonb
        ) as "dealTags"
      FROM deals d
      LEFT JOIN deal_pipelines p ON d."pipelineId" = p.id
      LEFT JOIN deal_pipeline_stages s2 ON d."stageId" = s2.id
      LEFT JOIN properties prop ON d."propertyId" = prop.id
      LEFT JOIN users u ON d."assignedToId" = u.id
      WHERE d.id = $1
    `, [params.id]);

    if (!deal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(deal);
  } catch (error: any) {
    console.error('Error fetching deal:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deal', details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/investors/crm/deals/[id] - Update a deal
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      name,
      dealType,
      status,
      priority,
      pipelineId,
      stageId,
      propertyId,
      description,
      estimatedValue,
      estimatedCloseDate,
      actualCloseDate,
      source,
      assignedToId,
      tags,
      metadata,
    } = body;

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (dealType !== undefined) {
      updates.push(`"dealType" = $${paramIndex++}`);
      values.push(dealType);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`);
      values.push(priority);
    }
    if (pipelineId !== undefined) {
      updates.push(`"pipelineId" = $${paramIndex++}`);
      values.push(pipelineId);
    }
    if (stageId !== undefined) {
      updates.push(`"stageId" = $${paramIndex++}`);
      values.push(stageId);
    }
    if (propertyId !== undefined) {
      updates.push(`"propertyId" = $${paramIndex++}`);
      values.push(propertyId);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (estimatedValue !== undefined) {
      updates.push(`"estimatedValue" = $${paramIndex++}`);
      values.push(estimatedValue);
    }
    if (estimatedCloseDate !== undefined) {
      updates.push(`"estimatedCloseDate" = $${paramIndex++}`);
      values.push(estimatedCloseDate ? new Date(estimatedCloseDate) : null);
    }
    if (actualCloseDate !== undefined) {
      updates.push(`"actualCloseDate" = $${paramIndex++}`);
      values.push(actualCloseDate ? new Date(actualCloseDate) : null);
    }
    if (source !== undefined) {
      updates.push(`source = $${paramIndex++}`);
      values.push(source);
    }
    if (assignedToId !== undefined) {
      updates.push(`"assignedToId" = $${paramIndex++}`);
      values.push(assignedToId);
    }
    if (tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      values.push(JSON.stringify(tags));
    }
    if (metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(metadata));
    }

    if (updates.length > 0) {
      updates.push(`"updatedAt" = NOW()`);
      values.push(params.id);

      await query(`
        UPDATE deals SET ${updates.join(', ')} WHERE id = $${paramIndex}
      `, values);
    }

    // Update tags if provided
    if (tags !== undefined) {
      // Delete existing tags
      await query('DELETE FROM deal_tags WHERE "dealId" = $1', [params.id]);

      // Create new tags
      if (Array.isArray(tags) && tags.length > 0) {
        for (const tag of tags) {
          const tagId = `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await query(
            'INSERT INTO deal_tags (id, "dealId", tag, "createdAt") VALUES ($1, $2, $3, NOW())',
            [tagId, params.id, tag]
          );
        }
      }
    }

    // Fetch updated deal
    const deal = await queryOne(`
      SELECT 
        d.*,
        jsonb_build_object(
          'id', p.id,
          'name', p.name
        ) as pipeline,
        jsonb_build_object(
          'id', s.id,
          'name', s.name
        ) as stage,
        jsonb_build_object(
          'id', prop.id,
          'propertyId', prop."propertyId",
          'name', prop.name,
          'address', prop.address
        ) as property,
        jsonb_build_object(
          'id', u.id,
          'firstName', u."firstName",
          'lastName', u."lastName",
          'email', u.email
        ) as "assignedTo",
        COALESCE(
          (SELECT jsonb_agg(
            jsonb_build_object('id', dt.id, 'tag', dt.tag)
          ) FROM "DealTag" dt WHERE dt."dealId" = d.id),
          '[]'::jsonb
        ) as "dealTags"
      FROM deals d
      LEFT JOIN deal_pipelines p ON d."pipelineId" = p.id
      LEFT JOIN deal_pipeline_stages s ON d."stageId" = s.id
      LEFT JOIN properties prop ON d."propertyId" = prop.id
      LEFT JOIN users u ON d."assignedToId" = u.id
      WHERE d.id = $1
    `, [params.id]);

    return NextResponse.json(deal);
  } catch (error: any) {
    console.error('Error updating deal:', error);
    return NextResponse.json(
      { error: 'Failed to update deal', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/investors/crm/deals/[id] - Delete a deal
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    await query('DELETE FROM deals WHERE id = $1', [params.id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting deal:', error);
    return NextResponse.json(
      { error: 'Failed to delete deal', details: error.message },
      { status: 500 }
    );
  }
}
