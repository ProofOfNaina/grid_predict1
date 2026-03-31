import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useTrading } from '@/contexts/TradingContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface UserProfile {
  name: string;
  bio: string;
}

const Profile = () => {
  const { connected, publicKey } = useWallet();
  const navigate = useNavigate();
  const { bets } = useTrading();
  
  const [profile, setProfile] = useState<UserProfile>({ name: '', bio: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UserProfile>({ name: '', bio: '' });
  const [showWallet, setShowWallet] = useState(false);

  useEffect(() => {
    if (!connected && publicKey === null) {
      // Allow some time for wallet to connect, otherwise redirect if strictly needed
      // but for now let's just show a connect wallet message
    } else if (publicKey) {
      const loadProfile = async () => {
        let loadedFromDb = false;
        
        if (isSupabaseConfigured()) {
          try {
            const { data, error } = await supabase!
              .from('profiles')
              .select('name, bio')
              .eq('wallet_address', publicKey.toBase58())
              .maybeSingle();
              
            if (data && !error) {
              const profileData = { name: data.name || '', bio: data.bio || '' };
              setProfile(profileData);
              setFormData(profileData);
              loadedFromDb = true;
              // update local storage cache
              localStorage.setItem(`profile_${publicKey.toBase58()}`, JSON.stringify(profileData));
            }
          } catch (err) {
            console.error("Error loading profile from Supabase", err);
          }
        }

        if (!loadedFromDb) {
          const stored = localStorage.getItem(`profile_${publicKey.toBase58()}`);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              setProfile(parsed);
              setFormData(parsed);
            } catch (e) {
              console.error("Failed to parse stored profile", e);
            }
          }
        }
      };

      loadProfile();
    }
  }, [connected, publicKey]);

  const handleSave = async () => {
    if (publicKey) {
      localStorage.setItem(`profile_${publicKey.toBase58()}`, JSON.stringify(formData));
      setProfile(formData);
      setIsEditing(false);
      
      if (isSupabaseConfigured()) {
        try {
          const { error } = await supabase!.from('profiles').upsert({
            wallet_address: publicKey.toBase58(),
            name: formData.name,
            bio: formData.bio
          }, { onConflict: 'wallet_address' });
          
          if (error) {
            console.error("Supabase upsert error:", error);
            toast.error(`Database Sync Failed: ${error.message || 'Unknown error'}`);
            return;
          }
        } catch (err: any) {
          console.error("Exception upserting to Supabase:", err);
          toast.error(`Network/Client Error: ${err.message || 'Check browser console'}`);
          return;
        }
      }
      
      toast.success('Profile updated successfully!');
    }
  };

  if (!connected) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-2xl font-bold mb-2">Wallet Not Connected</h2>
          <p className="text-muted-foreground mb-6">Please connect your wallet to view and edit your profile.</p>
          <Button onClick={() => navigate('/')}>Go Back Home</Button>
        </div>
      </div>
    );
  }

  const totalBets = bets.length;
  const totalWagered = bets.reduce((acc, bet) => acc + bet.amount, 0);
  const wonBets = bets.filter(b => b.status === 'TOUCHED');
  const totalWon = wonBets.reduce((acc, bet) => acc + bet.payout, 0);

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header />
      <div className="flex-1 overflow-y-auto p-6 md:p-12">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Your Profile</h1>
            <Button variant="outline" onClick={() => navigate('/app')}>Back to Trading</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="col-span-1 md:col-span-1 border-muted bg-card/40 backdrop-blur">
              <CardHeader>
                <CardTitle>Profile Details</CardTitle>
                <CardDescription>View and edit your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Display Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Satoshi"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Input
                        id="bio"
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        placeholder="Tell us about your trading style"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleSave} className="flex-1">Save</Button>
                      <Button variant="outline" onClick={() => { setIsEditing(false); setFormData(profile); }} className="flex-1">Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Display Name</h3>
                      <p className="text-lg font-semibold">{profile.name || 'Anonymous Trader'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Bio</h3>
                      <p className="text-base">{profile.bio || 'No bio provided yet.'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Wallet Address</h3>
                      <div className="flex items-center justify-between bg-muted p-2 rounded">
                        <p className="text-xs font-mono break-all">
                          {showWallet ? publicKey?.toBase58() : `${publicKey?.toBase58()?.slice(0, 4)}••••••••••••••••••••••••${publicKey?.toBase58()?.slice(-4)}`}
                        </p>
                        <Button variant="ghost" size="icon" className="h-6 w-6 ml-2" onClick={() => setShowWallet(!showWallet)}>
                          {showWallet ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <Button variant="secondary" onClick={() => setIsEditing(true)} className="w-full">
                      Edit Profile
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="col-span-1 md:col-span-2 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <Card className="border-muted bg-card/40 backdrop-blur">
                  <CardContent className="p-6">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total Bets</p>
                    <p className="text-2xl font-bold">{totalBets}</p>
                  </CardContent>
                </Card>
                <Card className="border-muted bg-card/40 backdrop-blur">
                  <CardContent className="p-6">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total Wagered</p>
                    <p className="text-2xl font-bold text-blue-400">{totalWagered.toFixed(2)} SOL</p>
                  </CardContent>
                </Card>
                <Card className="border-muted bg-card/40 backdrop-blur">
                  <CardContent className="p-6">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total Won</p>
                    <p className="text-2xl font-bold text-green-400">{totalWon.toFixed(2)} SOL</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-muted bg-card/40 backdrop-blur">
                <CardHeader>
                  <CardTitle>History</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="all" className="w-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="all">All Bets</TabsTrigger>
                      <TabsTrigger value="won">Won Only</TabsTrigger>
                    </TabsList>
                    <TabsContent value="all" className="space-y-4">
                      {bets.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No bet history found.</p>
                      ) : (
                        <div className="space-y-3">
                          {bets.map(bet => (
                            <BetHistoryRow key={bet.id} bet={bet} />
                          ))}
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="won" className="space-y-4">
                      {wonBets.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No winning bets yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {wonBets.map(bet => (
                            <BetHistoryRow key={bet.id} bet={bet} />
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

function BetHistoryRow({ bet }: { bet: any }) {
  const isWon = bet.status === 'TOUCHED';
  const isLost = bet.status === 'EXPIRED';
  const isOpen = bet.status === 'OPEN' || bet.status === 'LOCKED';

  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-muted">
      <div>
        <div className="font-medium">
          Bet {bet.amount} SOL @ ${bet.priceMin.toFixed(2)}-${bet.priceMax.toFixed(2)}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {new Date(bet.placedAt).toLocaleString()}
        </div>
      </div>
      <div className="text-right">
        {isWon ? (
          <span className="text-green-500 font-bold">Won {bet.payout.toFixed(2)} SOL</span>
        ) : isLost ? (
          <span className="text-destructive font-bold">Lost</span>
        ) : isOpen ? (
          <span className="text-blue-400 font-bold">Pending</span>
        ) : (
          <span>{bet.status}</span>
        )}
        {bet.txHash && (
           <div className="text-[10px] mt-1 text-muted-foreground hover:underline cursor-pointer" onClick={() => window.open(`https://explorer.solana.com/tx/${bet.txHash}?cluster=devnet`, '_blank')}>
             {bet.txHash.slice(0, 8)}...
           </div>
        )}
      </div>
    </div>
  );
}

export default Profile;
