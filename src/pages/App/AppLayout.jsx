import { useEffect } from 'react'
import { useStore } from '../../store'
import ServerSidebar from '../../components/Layout/ServerSidebar'
import ChannelSidebar from '../../components/Layout/ChannelSidebar'
import ChatArea from '../../components/Chat/ChatArea'
import MembersList from '../../components/Layout/MembersList'
import UserBar from '../../components/Layout/UserBar'
import Settings from '../../components/Settings/Settings'
import CallBar from '../../components/Call/CallBar'
import styles from './AppLayout.module.css'

export default function AppLayout() {
  const { showSettings, showMembersList, activeCall } = useStore()

  if (showSettings) return <Settings />

  return (
    <div className={styles.layout}>
      {/* Far left: server/group icon rail */}
      <ServerSidebar />

      {/* Channel/DM list + user bar at bottom */}
      <div className={styles.leftPanel}>
        <ChannelSidebar />
        <UserBar />
      </div>

      {/* Main chat area */}
      <div className={styles.main}>
        {activeCall && <CallBar />}
        <ChatArea />
      </div>

      {/* Right: members list */}
      {showMembersList && <MembersList />}
    </div>
  )
}
