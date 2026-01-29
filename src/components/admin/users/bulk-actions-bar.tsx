import { useState } from "react"
import type { Table } from "@tanstack/react-table"
import {
	IconCash,
	IconUserCog,
} from "@tabler/icons-react"
import type { MockUser } from "@/lib/mock-data/users"
import type { FeeType, UserRole } from "@/generated/prisma"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { bulkMarkFeesPaid, changeUserRole } from "@/lib/server/admin/users"

interface BulkActionsBarProps {
	table: Table<MockUser>
}

const feeTypes: { value: FeeType; label: string }[] = [
	{ value: "FULL", label: "Full" },
	{ value: "STUDENT", label: "Student" },
	{ value: "INVITED", label: "Invited" },
	{ value: "STAFF", label: "Staff" },
	{ value: "CASH", label: "Cash" },
]

const userRoles: { value: UserRole; label: string }[] = [
	{ value: "AUTHOR", label: "Author" },
	{ value: "REVIEWER", label: "Reviewer" },
	{ value: "EDITOR", label: "Editor" },
	{ value: "ADMIN", label: "Administrator" },
]

export function BulkActionsBar({ table }: BulkActionsBarProps) {
	const { canChangeRoles } = useAdminAuth()
	const selectedRows = table.getFilteredSelectedRowModel().rows
	const selectedCount = selectedRows.length

	const [feeDialogOpen, setFeeDialogOpen] = useState(false)
	const [roleDialogOpen, setRoleDialogOpen] = useState(false)
	const [selectedFeeType, setSelectedFeeType] = useState<FeeType>("FULL")
	const [selectedRole, setSelectedRole] = useState<UserRole>("AUTHOR")
	const [isLoading, setIsLoading] = useState(false)

	if (selectedCount === 0) return null

	const handleMarkFeesPaid = () => {
		setIsLoading(true)
		try {
			const userIds = selectedRows.map((row) => row.original.id)
			bulkMarkFeesPaid({ userIds, feeType: selectedFeeType })
			table.resetRowSelection()
			setFeeDialogOpen(false)
			// TODO: Refresh data / invalidate query
		} finally {
			setIsLoading(false)
		}
	}

	const handleChangeRole = () => {
		setIsLoading(true)
		try {
			// Change role for each selected user
			for (const row of selectedRows) {
				changeUserRole({ userId: row.original.id, role: selectedRole })
			}
			table.resetRowSelection()
			setRoleDialogOpen(false)
			// TODO: Refresh data / invalidate query
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<>
			<div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2">
				<span className="text-sm font-medium">
					{selectedCount} selected
				</span>
				<div className="h-4 w-px bg-border" />
				<Button
					variant="outline"
					size="sm"
					onClick={() => setFeeDialogOpen(true)}
				>
					<IconCash className="mr-2 size-4" />
					Mark fee paid
				</Button>
				{canChangeRoles && (
					<Button
						variant="outline"
						size="sm"
						onClick={() => setRoleDialogOpen(true)}
					>
						<IconUserCog className="mr-2 size-4" />
						Change role
					</Button>
				)}
			</div>

			{/* Fee Dialog */}
			<Dialog open={feeDialogOpen} onOpenChange={setFeeDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Mark fee as paid</DialogTitle>
						<DialogDescription>
							Select fee type for {selectedCount} selected users.
						</DialogDescription>
					</DialogHeader>
					<div className="py-4">
						<Select
							value={selectedFeeType}
							onValueChange={(v) => setSelectedFeeType(v as FeeType)}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select fee type" />
							</SelectTrigger>
							<SelectContent>
								{feeTypes.map((type) => (
									<SelectItem key={type.value} value={type.value}>
										{type.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setFeeDialogOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleMarkFeesPaid} disabled={isLoading}>
							{isLoading ? "Saving..." : "Save"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Role Dialog */}
			<Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Change user role</DialogTitle>
						<DialogDescription>
							Select new role for {selectedCount} selected users.
						</DialogDescription>
					</DialogHeader>
					<div className="py-4">
						<Select
							value={selectedRole}
							onValueChange={(v) => setSelectedRole(v as UserRole)}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select role" />
							</SelectTrigger>
							<SelectContent>
								{userRoles.map((role) => (
									<SelectItem key={role.value} value={role.value}>
										{role.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleChangeRole} disabled={isLoading}>
							{isLoading ? "Saving..." : "Save"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
