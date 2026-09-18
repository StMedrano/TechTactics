import { useCallback, useEffect, useMemo, useState } from 'react'
import PortalLayout from '../../../components/layout/PortalLayout'
import Card from '../../../components/ui/Card'
import { appService } from '../../../services/appService'

const fallbackRoles = [
  {
    key: 'admin',
    label: 'Admin',
    baseRole: 'admin',
    description: 'Full access to the admin portal, users, billing, and settings.',
    system: true,
  },
  {
    key: 'employee',
    label: 'Employee',
    baseRole: 'employee',
    description: 'Access to time tracking, assigned jobs, and pay details.',
    system: true,
  },
  {
    key: 'customer',
    label: 'Customer',
    baseRole: 'customer',
    description: 'Access to service requests, invoices, and customer profile tools.',
    system: true,
  },
]

const blankUserForm = {
  name: '',
  email: '',
  password: '',
  assignedRole: 'customer',
  phone: '',
  address: '',
  isActive: true,
}

const blankRoleForm = {
  key: '',
  label: '',
  baseRole: 'customer',
  description: '',
}

function normalizeRoleKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState(fallbackRoles)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingUser, setSavingUser] = useState(false)
  const [savingRole, setSavingRole] = useState(false)
  const [editingUserId, setEditingUserId] = useState('')
  const [editingRoleKey, setEditingRoleKey] = useState('')
  const [userForm, setUserForm] = useState(blankUserForm)
  const [roleForm, setRoleForm] = useState(blankRoleForm)

  const loadPage = useCallback(async () => {
    setLoading(true)
    setError('')
    const [usersResult, rolesResult] = await Promise.allSettled([
      appService.getUsers(),
      appService.getRoles(),
    ])

    const messages = []

    if (usersResult.status === 'fulfilled') {
      setUsers(Array.isArray(usersResult.value) ? usersResult.value : [])
    } else {
      setUsers([])
      messages.push(usersResult.reason?.message || 'Unable to load portal users.')
    }

    if (rolesResult.status === 'fulfilled') {
      const nextRoles = Array.isArray(rolesResult.value?.roles) && rolesResult.value.roles.length
        ? rolesResult.value.roles
        : fallbackRoles
      setRoles(nextRoles)
    } else {
      setRoles(fallbackRoles)
      messages.push(rolesResult.reason?.message || 'Unable to load portal roles.')
    }

    setError(messages.join(' '))
    setLoading(false)
  }, [])

  useEffect(() => {
    loadPage()
  }, [loadPage])

  const systemRoles = useMemo(() => roles.filter((role) => role.system), [roles])
  const assignableRoles = useMemo(() => roles, [roles])
  const customRoles = useMemo(() => roles.filter((role) => !role.system), [roles])

  const resetUserForm = () => {
    setEditingUserId('')
    setUserForm(blankUserForm)
  }

  const resetRoleForm = () => {
    setEditingRoleKey('')
    setRoleForm(blankRoleForm)
  }

  const onUserFieldChange = (field, value) => {
    setUserForm((current) => ({ ...current, [field]: value }))
  }

  const onRoleFieldChange = (field, value) => {
    setRoleForm((current) => ({ ...current, [field]: value }))
  }

  const onSubmitUser = async (event) => {
    event.preventDefault()
    setSavingUser(true)
    setError('')

    try {
      const payload = {
        ...userForm,
        assignedRole: userForm.assignedRole,
      }

      if (!payload.password) {
        delete payload.password
      }

      if (editingUserId) {
        await appService.updateUser(editingUserId, payload)
      } else {
        await appService.createUser(payload)
      }

      resetUserForm()
      await loadPage()
    } catch (err) {
      setError(err.message || 'Unable to save the user.')
    } finally {
      setSavingUser(false)
    }
  }

  const onEditUser = (user) => {
    setEditingUserId(user.id)
    setUserForm({
      name: user.name || '',
      email: user.email || '',
      password: '',
      assignedRole: user.assignedRole || user.role || 'customer',
      phone: user.phone || '',
      address: user.address || '',
      isActive: user.isActive !== false,
    })
  }

  const onDeleteUser = async (user) => {
    if (!window.confirm(`Delete ${user.email}? This removes their portal account.`)) {
      return
    }

    setError('')
    try {
      await appService.deleteUser(user.id)
      if (editingUserId === user.id) {
        resetUserForm()
      }
      await loadPage()
    } catch (err) {
      setError(err.message || 'Unable to delete the user.')
    }
  }

  const onSubmitRole = async (event) => {
    event.preventDefault()
    setSavingRole(true)
    setError('')

    try {
      const payload = {
        ...roleForm,
        key: normalizeRoleKey(roleForm.key),
      }

      if (editingRoleKey) {
        await appService.updateRole(editingRoleKey, payload)
      } else {
        await appService.createRole(payload)
      }

      resetRoleForm()
      await loadPage()
    } catch (err) {
      setError(err.message || 'Unable to save the role.')
    } finally {
      setSavingRole(false)
    }
  }

  const onEditRole = (role) => {
    if (role.system) return
    setEditingRoleKey(role.key)
    setRoleForm({
      key: role.key,
      label: role.label || '',
      baseRole: role.baseRole || 'customer',
      description: role.description || '',
    })
  }

  const onDeleteRole = async (role) => {
    if (role.system) {
      return
    }

    if (!window.confirm(`Delete the ${role.label} role? Users must be reassigned first.`)) {
      return
    }

    setError('')
    try {
      await appService.deleteRole(role.key)
      if (editingRoleKey === role.key) {
        resetRoleForm()
      }
      await loadPage()
    } catch (err) {
      setError(err.message || 'Unable to delete the role.')
    }
  }

  return (
    <PortalLayout title="Users & Roles">
      {error && (
        <Card title="Load Error">
          <p>{error}</p>
        </Card>
      )}

      <div className="grid grid-2 portal-grid-gap">
        <Card
          title={editingUserId ? 'Edit User' : 'Create User'}
          subtitle="Create portal accounts, assign roles, and manage account status."
          action={
            editingUserId ? (
              <button className="btn btn-secondary" type="button" onClick={resetUserForm}>
                Cancel
              </button>
            ) : null
          }
        >
          <form className="form-grid" onSubmit={onSubmitUser}>
            <label>
              Full Name
              <input value={userForm.name} onChange={(event) => onUserFieldChange('name', event.target.value)} />
            </label>

            <label>
              Email
              <input
                type="email"
                value={userForm.email}
                onChange={(event) => onUserFieldChange('email', event.target.value)}
              />
            </label>

            <label>
              Password
              <input
                type="password"
                placeholder={editingUserId ? 'Leave blank to keep current password' : ''}
                value={userForm.password}
                onChange={(event) => onUserFieldChange('password', event.target.value)}
              />
            </label>

            <label>
              Assigned Role
              <select
                value={userForm.assignedRole}
                onChange={(event) => onUserFieldChange('assignedRole', event.target.value)}
              >
                {assignableRoles.map((role) => (
                  <option key={role.key} value={role.key}>
                    {role.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Phone
              <input value={userForm.phone} onChange={(event) => onUserFieldChange('phone', event.target.value)} />
            </label>

            <label>
              Address
              <input value={userForm.address} onChange={(event) => onUserFieldChange('address', event.target.value)} />
            </label>

            <label className="full-width checkbox-row">
              <input
                type="checkbox"
                checked={Boolean(userForm.isActive)}
                onChange={(event) => onUserFieldChange('isActive', event.target.checked)}
              />
              <span>Active account</span>
            </label>

            <div className="full-width inline-actions">
              <button className="btn btn-primary" type="submit" disabled={savingUser}>
                {savingUser
                  ? editingUserId
                    ? 'Saving User...'
                    : 'Creating User...'
                  : editingUserId
                    ? 'Save User'
                    : 'Create User'}
              </button>
              {editingUserId && (
                <button className="btn btn-secondary" type="button" onClick={resetUserForm}>
                  Reset
                </button>
              )}
            </div>
          </form>
        </Card>

        <Card
          title={editingRoleKey ? 'Edit Custom Role' : 'Create Custom Role'}
          subtitle="Custom roles inherit access from one base role: admin, employee, or customer."
          action={
            editingRoleKey ? (
              <button className="btn btn-secondary" type="button" onClick={resetRoleForm}>
                Cancel
              </button>
            ) : null
          }
        >
          <form className="form-grid" onSubmit={onSubmitRole}>
            <label>
              Role Key
              <input
                value={roleForm.key}
                disabled={Boolean(editingRoleKey)}
                onChange={(event) => onRoleFieldChange('key', normalizeRoleKey(event.target.value))}
              />
            </label>

            <label>
              Label
              <input value={roleForm.label} onChange={(event) => onRoleFieldChange('label', event.target.value)} />
            </label>

            <label>
              Base Role
              <select
                value={roleForm.baseRole}
                onChange={(event) => onRoleFieldChange('baseRole', event.target.value)}
              >
                {systemRoles.map((role) => (
                  <option key={role.key} value={role.key}>
                    {role.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="full-width">
              Description
              <textarea
                rows="4"
                value={roleForm.description}
                onChange={(event) => onRoleFieldChange('description', event.target.value)}
              />
            </label>

            <div className="full-width inline-actions">
              <button className="btn btn-primary" type="submit" disabled={savingRole}>
                {savingRole
                  ? editingRoleKey
                    ? 'Saving Role...'
                    : 'Creating Role...'
                  : editingRoleKey
                    ? 'Save Role'
                    : 'Create Role'}
              </button>
              {editingRoleKey && (
                <button className="btn btn-secondary" type="button" onClick={resetRoleForm}>
                  Reset
                </button>
              )}
            </div>
          </form>
        </Card>
      </div>

      <div className="grid grid-2 portal-grid-gap">
        <Card title="Portal Users" subtitle={loading ? 'Loading users...' : 'Create, edit, deactivate, and delete portal users.'}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Assigned Role</th>
                  <th>Portal Access</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name || '-'}</td>
                    <td>{user.email}</td>
                    <td>{user.assignedRoleLabel || user.assignedRole || user.role}</td>
                    <td>{user.effectiveRoleLabel || user.roleLabel || user.effectiveRole || user.role}</td>
                    <td>{user.isActive ? 'Active' : 'Inactive'}</td>
                    <td>
                      <div className="inline-actions compact-actions">
                        <button className="btn btn-secondary" type="button" onClick={() => onEditUser(user)}>
                          Edit
                        </button>
                        <button className="btn btn-secondary danger-outline" type="button" onClick={() => onDeleteUser(user)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!users.length && !loading && (
                  <tr>
                    <td colSpan="6">No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card
          title="Portal Roles"
          subtitle={
            loading
              ? 'Loading roles...'
              : 'Built-in roles are locked. Custom roles inherit routing and permissions from a base role.'
          }
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Key</th>
                  <th>Base Role</th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.key}>
                    <td>{role.label}</td>
                    <td>{role.key}</td>
                    <td>{role.baseRole}</td>
                    <td>{role.system ? 'Built-in' : 'Custom'}</td>
                    <td>
                      {role.system ? (
                        'Locked'
                      ) : (
                        <div className="inline-actions compact-actions">
                          <button className="btn btn-secondary" type="button" onClick={() => onEditRole(role)}>
                            Edit
                          </button>
                          <button className="btn btn-secondary danger-outline" type="button" onClick={() => onDeleteRole(role)}>
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {!roles.length && !loading && (
                  <tr>
                    <td colSpan="5">No roles found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {customRoles.length > 0 && (
            <div className="stack gap-sm roles-help">
              <strong>Custom role descriptions</strong>
              <ul className="clean-list">
                {customRoles.map((role) => (
                  <li key={`${role.key}-description`}>
                    <strong>{role.label}</strong>
                    <div className="sub-cell">
                      {role.description || `Inherits ${role.baseRole} access.`}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>
    </PortalLayout>
  )
}
