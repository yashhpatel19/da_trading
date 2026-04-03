import { getSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import axios from 'axios'
import Layout from '../../components/Layout'

export async function getServerSideProps(context) {
  const session = await getSession(context)
  if (!session) return { redirect: { destination: '/', permanent: false } }
  return { props: {} }
}

function TagInput({ label, values = [], onChange }) {
  const [input, setInput] = useState('')

  const add = () => {
    const val = input.trim()
    if (val && !values.includes(val)) onChange([...values, val])
    setInput('')
  }

  const remove = (v) => onChange(values.filter(x => x !== v))

  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {values.map(v => (
          <span key={v} className="flex items-center gap-1 px-2 py-0.5 bg-dark-surface rounded text-xs text-gray-300 border border-dark-border">
            {v}
            <button type="button" onClick={() => remove(v)} className="text-gray-500 hover:text-red-400 ml-0.5">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input className="input flex-1 text-sm" placeholder={`Add ${label.toLowerCase()}...`}
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }} />
        <button type="button" onClick={add}
          className="px-3 py-1.5 text-xs bg-brand-blue/20 text-brand-blue rounded-lg hover:bg-brand-blue/30 transition-colors">
          Add
        </button>
      </div>
    </div>
  )
}

function CategoryForm({ initial = null, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || '')
  const [sizes, setSizes] = useState(initial?.sizes || [])
  const [grades, setGrades] = useState(initial?.grades || [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (initial) {
        const res = await axios.put(`/api/categories/${initial._id}`, { name, sizes, grades })
        onSave(res.data)
      } else {
        const res = await axios.post('/api/categories', { name, sizes, grades })
        onSave(res.data)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div className="section-title">{initial ? 'Edit Category' : 'New Category'}</div>
      {error && <div className="text-red-400 text-sm">{error}</div>}
      <div>
        <label className="label">Category Name *</label>
        <input className="input" placeholder="e.g. Sawn Timber" value={name}
          onChange={e => setName(e.target.value)} required />
      </div>
      <TagInput label="Sizes" values={sizes} onChange={setSizes} />
      <TagInput label="Grades" values={grades} onChange={setGrades} />
      <div className="flex gap-3 pt-1">
        <button type="submit" className="btn-primary px-5 py-2" disabled={saving}>
          {saving ? 'Saving...' : initial ? 'Save Changes' : 'Create'}
        </button>
        <button type="button" className="btn-secondary px-5" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [editing, setEditing]       = useState(null)

  const load = async () => {
    setLoading(true)
    const res = await axios.get('/api/categories')
    setCategories(res.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!confirm('Delete this category?')) return
    await axios.delete(`/api/categories/${id}`)
    setCategories(prev => prev.filter(c => c._id !== id))
  }

  const handleSave = (cat) => {
    if (editing) {
      setCategories(prev => prev.map(c => c._id === cat._id ? cat : c))
      setEditing(null)
    } else {
      setCategories(prev => [...prev, cat])
      setShowForm(false)
    }
  }

  return (
    <Layout title="Product Categories">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Product Categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">Define categories with preset sizes and grades for product lines</p>
        </div>
        {!showForm && !editing && (
          <button onClick={() => setShowForm(true)} className="btn-primary px-4 py-2 text-sm">
            + New Category
          </button>
        )}
      </div>

      {(showForm) && (
        <div className="mb-6">
          <CategoryForm onSave={handleSave} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {loading ? (
        <div className="text-gray-500 text-sm">Loading...</div>
      ) : categories.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <div className="text-3xl mb-3">📦</div>
          <div className="font-medium">No categories yet</div>
          <div className="text-sm mt-1">Add a category to enable dropdowns in the deal form</div>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map(cat => (
            editing?._id === cat._id ? (
              <CategoryForm key={cat._id} initial={cat} onSave={handleSave} onCancel={() => setEditing(null)} />
            ) : (
              <div key={cat._id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-white">{cat.name}</div>
                    {cat.sizes?.length > 0 && (
                      <div className="mt-2">
                        <span className="text-xs text-gray-500 mr-2">Sizes:</span>
                        {cat.sizes.map(s => (
                          <span key={s} className="inline-block mr-1 mb-1 px-2 py-0.5 bg-dark-surface text-xs text-gray-300 rounded border border-dark-border">{s}</span>
                        ))}
                      </div>
                    )}
                    {cat.grades?.length > 0 && (
                      <div className="mt-1">
                        <span className="text-xs text-gray-500 mr-2">Grades:</span>
                        {cat.grades.map(g => (
                          <span key={g} className="inline-block mr-1 mb-1 px-2 py-0.5 bg-dark-surface text-xs text-gray-300 rounded border border-dark-border">{g}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4 shrink-0">
                    <button onClick={() => setEditing(cat)} className="text-xs text-brand-blue hover:underline">Edit</button>
                    <button onClick={() => handleDelete(cat._id)} className="text-xs text-red-400 hover:underline">Delete</button>
                  </div>
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </Layout>
  )
}
