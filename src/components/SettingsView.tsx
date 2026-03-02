import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CoupleProfile } from "@/types/budget";
import { ArrowLeft, Heart } from "lucide-react";

interface SettingsViewProps {
  profile: CoupleProfile;
  onUpdateProfile: (p: CoupleProfile) => void;
  onBack: () => void;
}

export default function SettingsView({ profile, onUpdateProfile, onBack }: SettingsViewProps) {
  const [nameA, setNameA] = useState(profile.partnerAName);
  const [nameB, setNameB] = useState(profile.partnerBName);

  const handleSave = () => {
    onUpdateProfile({ partnerAName: nameA, partnerBName: nameB });
    onBack();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="min-h-screen bg-background p-6"
    >
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm">Back</span>
      </button>

      <h1 className="font-display text-2xl font-bold mb-6">Settings</h1>

      <div className="glass-card rounded-3xl p-6 space-y-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Heart className="h-4 w-4 text-partner-a" />
          <span>Partner Names</span>
        </div>
        <div>
          <Label htmlFor="nameA">Partner A</Label>
          <Input
            id="nameA"
            value={nameA}
            onChange={(e) => setNameA(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="nameB">Partner B</Label>
          <Input
            id="nameB"
            value={nameB}
            onChange={(e) => setNameB(e.target.value)}
            className="mt-1"
          />
        </div>
        <Button onClick={handleSave} className="w-full" size="lg">
          Save Names
        </Button>
      </div>

      <div className="mt-8 text-center text-xs text-muted-foreground">
        <p>All data stored locally on your device</p>
        <p>No internet connection required ✨</p>
      </div>
    </motion.div>
  );
}
