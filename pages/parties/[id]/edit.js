import { getSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'
import Layout from '../../../components/Layout'
import PartyForm from '../../../components/PartyForm'

export async function getServerSideProps(context) {
  const session = await getSession(context)
  if (!session) return { redirect: { destination: '/', permanent: false } }
  return { props: {} }
}

export default function EditPartyPage() {
  const router = useRouter()
  const { id } = router.query
  const [party, setParty] = useState(null)

  useEffect(() => {
    if (id) {
      axios.get(`/api/parties/${id}`).then(r => setParty(r.data.party))
    }
  }, [id])

  if (!party) return <Layout><div className="flex items-center justify-center h-64"><div className="text-gray-500">Loading...</div></div></Layout>

  return (
    <Layout>
      <div className="max-w-3xl">
        <div className="mb-6">
          <h1 className="page-title">Edit Party</h1>
          <p className="text-gray-500 text-sm mt-1">{party.name}</p>
        </div>
        <PartyForm initialData={party} mode="edit" />
      </div>
    </Layout>
  )
}
