from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
import asyncio
from ...db.models import Group

router = APIRouter()

# GROUP ENDPOINTS
@router.get("/", response_model=List[dict])
async def get_groups():
    """Get all groups"""
    try:
        groups = Group.get_all()
        # Format the response to include description field
        formatted_groups = []
        for group in groups:
            formatted_group = {
                "id": group["id"],
                "name": group["name"],
                "description": "",  # Schema doesn't have description, but API expects it
                "member_count": group.get("member_count", 0)
            }
            formatted_groups.append(formatted_group)
        return formatted_groups
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_group(group: dict):
    """Create a new group"""
    try:
        name = group.get("name")
        if not name:
            raise HTTPException(status_code=400, detail="Group name is required")
        
        # For now, we'll use user_id 1 as the creator (first user)
        # In a real app, this would come from authentication
        created_by = group.get("created_by", 1)
        description = group.get("description", "")
        
        new_group = Group.create(
            name=name,
            created_by=created_by,
            description=description
        )
        
        if not new_group:
            raise HTTPException(status_code=500, detail="Failed to create group")
        
        return new_group
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/{group_id}")
async def get_group(group_id: int):
    """Get a specific group by ID"""
    try:
        group = Group.get_by_id(group_id)
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        
        # Format the response to include description field
        formatted_group = {
            "id": group["id"],
            "name": group["name"],
            "description": "",  # Schema doesn't have description, but API expects it
            "member_count": group.get("member_count", 0)
        }
        
        return formatted_group
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.put("/{group_id}")
async def update_group(group_id: int, group: dict):
    """Update a specific group"""
    try:
        # Check if group exists
        existing_group = Group.get_by_id(group_id)
        if not existing_group:
            raise HTTPException(status_code=404, detail="Group not found")
        
        # Note: The current schema doesn't support updating group name directly
        # This would need to be implemented in the Group model
        raise HTTPException(status_code=501, detail="Group update not implemented in current schema")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(group_id: int):
    """Delete a specific group"""
    try:
        # Check if group exists
        existing_group = Group.get_by_id(group_id)
        if not existing_group:
            raise HTTPException(status_code=404, detail="Group not found")
        
        # Note: The current schema would need CASCADE delete implementation
        # For now, we'll return not implemented
        raise HTTPException(status_code=501, detail="Group deletion not implemented in current schema")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# GROUP MEMBER ENDPOINTS
@router.get("/{group_id}/members")
async def get_group_members(group_id: int):
    """Get all members of a specific group"""
    try:
        # Check if group exists
        existing_group = Group.get_by_id(group_id)
        if not existing_group:
            raise HTTPException(status_code=404, detail="Group not found")
        
        member_ids = Group.get_members(group_id)
        return {
            "group_id": group_id, 
            "member_ids": member_ids, 
            "member_count": len(member_ids)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/{group_id}/members/{user_id}", status_code=status.HTTP_201_CREATED)
async def add_user_to_group(group_id: int, user_id: int):
    """Add a user to a group"""
    try:
        # Check if group exists
        existing_group = Group.get_by_id(group_id)
        if not existing_group:
            raise HTTPException(status_code=404, detail="Group not found")
        
        # Check if user is already in group
        current_members = Group.get_members(group_id)
        if user_id in current_members:
            raise HTTPException(status_code=409, detail="User already in group")
        
        success = Group.add_member(group_id, user_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to add user to group")
        
        return {"message": f"User {user_id} added to group {group_id}"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.delete("/{group_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_user_from_group(group_id: int, user_id: int):
    """Remove a user from a group"""
    try:
        # Check if group exists
        existing_group = Group.get_by_id(group_id)
        if not existing_group:
            raise HTTPException(status_code=404, detail="Group not found")
        
        # Check if user is in group
        current_members = Group.get_members(group_id)
        if user_id not in current_members:
            raise HTTPException(status_code=404, detail="User not in group")
        
        success = Group.remove_member(group_id, user_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to remove user from group")
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/{group_id}/members/count")
async def get_group_member_count(group_id: int):
    """Get the number of members in a group"""
    try:
        # Check if group exists
        existing_group = Group.get_by_id(group_id)
        if not existing_group:
            raise HTTPException(status_code=404, detail="Group not found")
        
        member_ids = Group.get_members(group_id)
        return {"group_id": group_id, "member_count": len(member_ids)}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    # GROUP JOIN/LEAVE/INVITE/GETID ENDPOINTS
    @router.post("/{group_id}/join", status_code=status.HTTP_201_CREATED)
    async def join_group(group_id: int, user_id: int):
        """User joins a group"""
        try:
            existing_group = Group.get_by_id(group_id)
            if not existing_group:
                raise HTTPException(status_code=404, detail="Group not found")
            current_members = Group.get_members(group_id)
            if user_id in current_members:
                raise HTTPException(status_code=409, detail="User already in group")
            success = Group.add_member(group_id, user_id)
            if not success:
                raise HTTPException(status_code=500, detail="Failed to join group")
            return {"message": f"User {user_id} joined group {group_id}"}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    @router.delete("/{group_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
    async def leave_group(group_id: int, user_id: int):
        """User leaves a group"""
        try:
            existing_group = Group.get_by_id(group_id)
            if not existing_group:
                raise HTTPException(status_code=404, detail="Group not found")
            current_members = Group.get_members(group_id)
            if user_id not in current_members:
                raise HTTPException(status_code=404, detail="User not in group")
            success = Group.remove_member(group_id, user_id)
            if not success:
                raise HTTPException(status_code=500, detail="Failed to leave group")
            return None
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    @router.post("/{group_id}/invite", status_code=status.HTTP_201_CREATED)
    async def invite_to_group(group_id: int, invite: dict):
        """Invite a user to a group (adds user as member)"""
        try:
            user_id = invite.get("user_id")
            role = invite.get("role", "member")
            if not user_id:
                raise HTTPException(status_code=400, detail="user_id is required")
            existing_group = Group.get_by_id(group_id)
            if not existing_group:
                raise HTTPException(status_code=404, detail="Group not found")
            current_members = Group.get_members(group_id)
            if user_id in current_members:
                raise HTTPException(status_code=409, detail="User already in group")
            success = Group.add_member(group_id, user_id, role)
            if not success:
                raise HTTPException(status_code=500, detail="Failed to invite user to group")
            return {"message": f"User {user_id} invited to group {group_id} as {role}"}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    @router.get("/getid")
    async def get_group_id(name: str):
        """Get group ID by name"""
        try:
            groups = Group.get_all()
            for group in groups:
                if group["name"].lower() == name.lower():
                    return {"id": group["id"], "name": group["name"]}
            raise HTTPException(status_code=404, detail="Group not found")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
