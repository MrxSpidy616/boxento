import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ChangelogData } from '@/types/changelog';
import { Sparkles } from 'lucide-react';

const parseChangelog = async (): Promise<ChangelogData> => {
    try {
        // Add cache-busting to ensure we get the latest changelog
        const response = await fetch(`/CHANGELOG.md?v=${__BUILD_HASH__}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        
        // Split the content by sections
        const sections = text.split('\n## ').slice(1); // Skip the header
        const versions = sections.map(section => {
            const lines = section.split('\n');
            const dateTitle = lines[0].trim(); // e.g., "March 19, 2025"
            
            const changes: { [key: string]: string[] } = {};
            let currentCategory = '';
            
            lines.slice(1).forEach(line => {
                if (line.startsWith('### ')) {
                    currentCategory = line.replace('### ', '').trim();
                    changes[currentCategory] = [];
                } else if (line.startsWith('• ')) {
                    const change = line.replace('• ', '').trim();
                    if (currentCategory && change) {
                        changes[currentCategory].push(change);
                    }
                } else if (line.startsWith('  - ')) {
                    // Handle sub-bullets for widget list
                    const change = line.replace('  - ', '').trim();
                    if (currentCategory && change) {
                        changes[currentCategory].push(change);
                    }
                }
            });
            
            return {
                version: dateTitle.split(' ')[0] + ' ' + dateTitle.split(' ')[1], // e.g., "March 19"
                date: dateTitle,
                changes
            };
        });
        
        return { versions };
    } catch (error) {
        console.error('Failed to load changelog:', error);
        return { versions: [] };
    }
};

export function Changelog() {
    const [changelog, setChangelog] = useState<ChangelogData>({ versions: [] });

    useEffect(() => {
        const loadChangelog = async () => {
            const data = await parseChangelog();
            setChangelog(data);
        };
        loadChangelog();
    }, []);

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className="relative h-9 w-9 rounded-full"
                >
                    <Sparkles className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[625px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Sparkles className="h-5 w-5 text-primary" />
                        What's New
                    </DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[450px] pr-4 -mr-4">
                    <div className="space-y-12 pr-4">
                        {changelog.versions.map((version, versionIndex) => (
                            <div key={version.date} className="relative">
                                <div className="sticky top-0 z-10 mb-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-4">
                                    <h3 className="text-xl font-semibold tracking-tight">
                                        {version.date}
                                    </h3>
                                </div>
                                <div className="space-y-8">
                                    {Object.entries(version.changes).map(([category, changes]) => (
                                        <div key={category} className="space-y-4">
                                            <h4 className="text-base font-medium text-primary">
                                                {category}
                                            </h4>
                                            <ul className="space-y-3 pl-1">
                                                {changes.map((change, index) => (
                                                    <li 
                                                        key={index} 
                                                        className={`relative pl-5 text-muted-foreground ${
                                                            change.startsWith('- ') ? 'ml-4' : ''
                                                        }`}
                                                    >
                                                        <span className="absolute left-0 top-[9px] h-1.5 w-1.5 rounded-full bg-primary/70"></span>
                                                        {change.startsWith('- ') ? change.slice(2) : change}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                                {versionIndex < changelog.versions.length - 1 && (
                                    <Separator className="mt-8 mb-4" />
                                )}
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
} 