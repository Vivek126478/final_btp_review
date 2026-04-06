import React, { useState, useEffect } from 'react';
import { getContract, formatAddress, formatEther, parseEther, getEthereumProvider } from '../utils/web3';
import { connectWallet } from '../utils/web3';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import DPoSGovernanceABI from '../contracts/DPoSGovernance.json';
import DisputeResolutionABI from '../contracts/DisputeResolution.json';
import toast from 'react-hot-toast';
import { Shield, Users, Gavel, CheckCircle2, XCircle } from 'lucide-react';

const Governance = () => {
  const [activeTab, setActiveTab] = useState('candidates');
  const [candidates, setCandidates] = useState([]);
  const [delegates, setDelegates] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [governanceContract, setGovernanceContract] = useState(null);
  const [disputeContract, setDisputeContract] = useState(null);
  const [userAddress, setUserAddress] = useState(null);

  useEffect(() => {
    const initContracts = async () => {
      try {
        if (!getEthereumProvider()) return;
        const address = await connectWallet();
        setUserAddress(address);

        const govContract = await getContract(CONTRACT_ADDRESSES.DPoSGovernance, DPoSGovernanceABI);
        const dispContract = await getContract(CONTRACT_ADDRESSES.DisputeResolution, DisputeResolutionABI);
        
        setGovernanceContract(govContract);
        setDisputeContract(dispContract);
      } catch (err) {
        console.error("Error connecting to contracts:", err);
      }
    };
    initContracts();
  }, []);

  useEffect(() => {
    if (governanceContract && disputeContract) {
      if (activeTab === 'candidates') fetchCandidates();
      if (activeTab === 'delegates') fetchDelegates();
      if (activeTab === 'disputes') fetchDisputes();
    }
  }, [governanceContract, disputeContract, activeTab]);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const count = await governanceContract.getCandidateCount();
      if (count > 0) {
        const candidateAddresses = await governanceContract.getCandidates(0, count);
        const candidateData = await Promise.all(
          candidateAddresses.map(async (addr) => {
            const data = await governanceContract.candidates(addr);
            return { address: addr, ...data };
          })
        );
        // filter out unregistered
        setCandidates(candidateData.filter(c => c.registered));
      } else {
        setCandidates([]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch candidates");
    } finally {
      setLoading(false);
    }
  };

  const fetchDelegates = async () => {
    setLoading(true);
    try {
      const delegateAddrs = await governanceContract.getDelegates();
      const delegateData = await Promise.all(
        delegateAddrs.map(async (addr) => {
          if (addr === '0x0000000000000000000000000000000000000000') return null;
          const data = await governanceContract.candidates(addr);
          return { address: addr, ...data };
        })
      );
      setDelegates(delegateData.filter(d => d !== null && d.registered));
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch delegates");
    } finally {
      setLoading(false);
    }
  };

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const dispCount = await disputeContract.disputeCount();
      const disputeData = [];
      for (let i = 0; i < dispCount; i++) {
        const data = await disputeContract.disputes(i);
        let hasVoted = false;
        if (userAddress) {
          hasVoted = await disputeContract.hasVoted(i, userAddress);
        }
        disputeData.push({ id: i, ...data, userHasVoted: hasVoted });
      }
      // sort latest first
      setDisputes(disputeData.reverse());
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch disputes");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterCandidate = async () => {
    if (!governanceContract) return toast.error("Connect wallet first!");
    try {
      const minStake = await governanceContract.minCandidateStake();
      const tx = await governanceContract.registerCandidate("IPFS_OR_HTTP_METADATA_URL", { value: minStake, gasLimit: 500000 });
      toast.loading("Registering candidate...", { id: "tx" });
      await tx.wait();
      toast.success("Registered successfully!", { id: "tx" });
      fetchCandidates();
    } catch (err) {
      console.error(err);
      toast.error(err.reason || "Failed to register", { id: "tx" });
    }
  };

  const handleVoteCandidate = async (candidateAddress) => {
    if (!governanceContract) return toast.error("Connect wallet first!");
    try {
      const tx = await governanceContract.vote(candidateAddress, { value: parseEther("0.01"), gasLimit: 500000 });
      toast.loading("Voting...", { id: "tx" });
      await tx.wait();
      toast.success("Vote cast successfully!", { id: "tx" });
      fetchCandidates();
    } catch (err) {
      console.error(err);
      toast.error(err.reason || "Failed to vote", { id: "tx" });
    }
  };

  const handleDelegateVote = async (disputeId, decision) => {
    if (!disputeContract) return toast.error("Connect wallet first!");
    try {
      // Decision mapping: 1 = Approve, 2 = Reject based on enum
      const decisionEnum = decision === 'Approve' ? 1 : 2;
      const tx = await disputeContract.delegateVote(disputeId, decisionEnum, { gasLimit: 500000 });
      toast.loading("Casting delegate vote...", { id: "tx" });
      await tx.wait();
      toast.success("Vote cast successfully!", { id: "tx" });
      fetchDisputes();
    } catch (err) {
      console.error(err);
      toast.error(err.reason || "Failed to vote on dispute (Are you a delegate?)", { id: "tx" });
    }
  };

  const tabs = [
    { id: 'candidates', name: 'Candidates', icon: Users },
    { id: 'delegates', name: 'Delegates', icon: Shield },
    { id: 'disputes', name: 'Disputes', icon: Gavel },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="h-8 w-8 text-indigo-600" />
            DPoS Governance
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Decentralized Delegate Mechanism for Platform Integrity and Dispute Resolution.
          </p>
        </div>
        <div>
          {(!userAddress) && (
             <p className="text-red-500 text-sm font-medium">Please connect your MetaMask wallet to interact.</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  ${activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                  group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                `}
              >
                <Icon
                  className={`
                    ${activeTab === tab.id ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'}
                    -ml-0.5 mr-2 h-5 w-5
                  `}
                />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white shadow rounded-lg p-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <>
            {/* Candidates Tab */}
            {activeTab === 'candidates' && (
              <div>
                <div className="mb-6 flex justify-between items-center">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Governance Candidates</h3>
                  <button
                    onClick={handleRegisterCandidate}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Register as Candidate
                  </button>
                </div>
                {candidates.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No candidates registered yet.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {candidates.map((c, idx) => (
                      <div key={idx} className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{formatAddress(c.address)}</p>
                          <p className="text-sm text-gray-500 truncate mt-1">Staked: {formatEther(c.stake)} ETH</p>
                          <p className="text-sm font-semibold text-indigo-600 mt-1">Votes: {formatEther(c.totalVotes)}</p>
                        </div>
                        <div>
                          <button
                            onClick={() => handleVoteCandidate(c.address)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700"
                          >
                            Vote (0.01)
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Delegates Tab */}
            {activeTab === 'delegates' && (
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">Top Elected Delegates</h3>
                {delegates.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No delegates elected yet.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {delegates.map((d, idx) => (
                      <div key={idx} className="relative rounded-lg border border-indigo-200 bg-indigo-50 px-6 py-5 shadow-sm flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <Shield className="h-8 w-8 text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{formatAddress(d.address)}</p>
                          <p className="text-sm font-semibold text-indigo-600 mt-1">Votes: {formatEther(d.totalVotes)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Disputes Tab */}
            {activeTab === 'disputes' && (
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">Active Disputes</h3>
                {disputes.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No disputes found.</p>
                ) : (
                  <div className="space-y-4">
                    {disputes.map((d) => (
                      <div key={d.id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 line">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-3">
                              <h4 className="text-lg font-bold text-gray-900">Dispute #{d.id}</h4>
                              {d.finalized ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  Finalized
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-2">Ride ID: {d.rideId.toString()}</p>
                            <p className="text-sm text-gray-500">Opened By: {formatAddress(d.openedBy)}</p>
                            <p className="text-xs text-gray-400 mt-2 break-all font-mono">Evidence Hash: {d.evidenceHash}</p>
                          </div>
                          
                          <div className="text-right">
                             <div className="flex gap-4 text-sm font-medium mb-4">
                               <div className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> {d.approveVotes.toString()} Approve</div>
                               <div className="text-red-600 flex items-center gap-1"><XCircle className="w-4 h-4"/> {d.rejectVotes.toString()} Reject</div>
                             </div>
                             
                             {!d.finalized && !d.userHasVoted && (
                               <div className="flex gap-2">
                                  <button onClick={() => handleDelegateVote(d.id, 'Approve')} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700">
                                    Approve
                                  </button>
                                  <button onClick={() => handleDelegateVote(d.id, 'Reject')} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-red-600 hover:bg-red-700">
                                    Reject
                                  </button>
                               </div>
                             )}
                             {!d.finalized && d.userHasVoted && (
                               <p className="text-sm text-gray-500 italic">You have voted</p>
                             )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Governance;
